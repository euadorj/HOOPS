import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BillSessionService, BillSession, MenuItem } from './bill-session.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-session-detail',
  templateUrl: 'session-detail.page.html',
  styleUrls: ['session-detail.page.scss'],
  standalone: false
})
export class SessionDetailPage implements OnInit {
  id: string | null = null;
  step: 'order' | 'payment' | 'complete' = 'order';
  paymentMethods = [
    { id: 'dbs', name: 'NETS - DBS', subtitle: 'DBS ••1234', badge: 'DBS', color: '#ff6d8c' },
    { id: 'ocbc', name: 'NETS - OCBC', subtitle: 'OCBC ••5678', badge: 'OCBC', color: '#4c7cff' },
    { id: 'uob', name: 'NETS - UOB', subtitle: 'UOB ••9012', badge: 'UOB', color: '#4a90e2' }
  ];
  selectedPaymentMethodId = 'dbs';
  transactionId = '';
  paidAt = new Date();
  paidAmount = 0;
  session: BillSession | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private billSessionService: BillSessionService,
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadSession();
  }

  loadSession() {
    if (!this.id) {
      return;
    }
    this.session = this.billSessionService.getSessionById(this.id) || null;
    if (!this.session) {
      this.router.navigate(['/tabs/tab2']);
    }
  }

  get selectedItems() {
    if (!this.session) {
      return [];
    }
    return this.session.menuCategories
      .reduce((items, category) => items.concat(category.items), [] as MenuItem[])
      .filter((item) => item.selected);
  }

  get selectedCount() {
    return this.selectedItems.length;
  }

  get sessionMembers() {
    if (!this.session) {
      return [];
    }

    const currentUserId = this.authService.getCurrentUser()?.id;
    return this.session.memberIds.map((memberId) => {
      const displayName = this.authService.getAccountDisplayName(
        this.authService.getAccountUsername(memberId) || memberId
      );
      return {
        memberId,
        displayName,
        initial: displayName.charAt(0).toUpperCase(),
        isCurrentUser: memberId === currentUserId
      };
    });
  }

  get totalAmount() {
    return this.selectedItems.reduce((sum, item) => sum + item.price, 0);
  }

  get headerTitle() {
    if (this.step === 'order') {
      return 'Select Items';
    }
    if (this.step === 'payment') {
      return 'Payment';
    }
    return 'Payment Complete';
  }

  get headerSubtitle() {
    if (this.step === 'order') {
      return 'Tap items you ordered';
    }
    if (this.step === 'payment') {
      return 'Choose payment method';
    }
    return 'Receipt and session details';
  }

  formatPrice(value: number) {
    return `$${value.toFixed(2)}`;
  }

  toggleItem(item: MenuItem) {
    item.selected = !item.selected;
  }

  continueToPayment() {
    if (!this.selectedCount) {
      return;
    }
    this.step = 'payment';
  }

  async confirmLeaveSession() {
    const alert = await this.alertController.create({
      header: 'Leave Session?',
      message: 'Are you sure you want to leave this bill-splitting session? You will need the session code to join again.',
      buttons: [
        {
          text: 'No, Stay',
          role: 'cancel'
        },
        {
          text: 'Yes, Leave',
          role: 'destructive',
          handler: () => this.leaveSession()
        }
      ]
    });
    await alert.present();
  }

  async leaveSession() {
    if (!this.id) {
      return;
    }

    const result = this.billSessionService.leaveSession(this.id);
    if (!result.success) {
      const alert = await this.alertController.create({
        header: 'Unable to Leave Session',
        message: result.message,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    await this.router.navigate(['/tabs/tab2']);
  }

  selectPaymentMethod(methodId: string) {
    this.selectedPaymentMethodId = methodId;
  }

  pay() {
    if (!this.selectedCount || !this.id) {
      return;
    }
    this.paidAmount = this.totalAmount;
    this.transactionId = 'TXN' + Math.floor(100000000 + Math.random() * 900000000).toString();
    this.paidAt = new Date();
    this.billSessionService.removeSelectedItems(this.id);
    this.loadSession();
    this.step = 'complete';
  }

  get selectedPaymentMethodName() {
    const method = this.paymentMethods.find((method) => method.id === this.selectedPaymentMethodId);
    return method ? method.name : '';
  }

  backToHome() {
    this.router.navigate(['/tabs/tab1']);
  }
}

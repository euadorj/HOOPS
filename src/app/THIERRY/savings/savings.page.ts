import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AlertController } from '@ionic/angular';

import {
  FinanceData,
  SavingsGoal,
  SavingsService,
} from '../savings.service';

@Component({
  selector: 'app-savings',
  templateUrl: './savings.page.html',
  styleUrls: ['./savings.page.scss'],
  standalone: false,
})
export class SavingsPage implements OnInit {
  financeData: FinanceData = {
    balance: 0,
    goals: [],
  };

  goalForm!: FormGroup;
  editGoalForm!: FormGroup;

  submitted = false;
  editSubmitted = false;

  editingGoalId: string | null = null;

  depositAmounts: Record<string, string> = {};

  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private savingsService: SavingsService,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.goalForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(40),
        ],
      ],
      targetAmount: [
        null,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],
    });

    this.editGoalForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(40),
        ],
      ],
      targetAmount: [
        null,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],
    });

    this.loadFinanceData();
  }

  ionViewWillEnter(): void {
    this.loadFinanceData();
  }

  get totalSaved(): number {
    return this.savingsService.getTotalSaved(
      this.financeData
    );
  }

  createGoal(): void {
    this.submitted = true;
    this.clearMessages();

    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }

    const name = String(
      this.goalForm.get('name')?.value ?? ''
    );

    const targetAmount = Number(
      this.goalForm.get('targetAmount')?.value
    );

    const result = this.savingsService.createGoal(
      name,
      targetAmount
    );

    if (!result.success) {
      this.errorMessage = result.message;
      return;
    }

    this.successMessage = result.message;

    this.goalForm.reset({
      name: '',
      targetAmount: null,
    });

    this.submitted = false;
    this.loadFinanceData();
  }

  setDepositAmount(
    event: any,
    goalId: string
  ): void {
    this.depositAmounts[goalId] =
      event.detail?.value ?? '';
  }

  deposit(goalId: string): void {
    this.clearMessages();

    const amount = Number(
      this.depositAmounts[goalId]
    );

    const result =
      this.savingsService.depositToGoal(
        goalId,
        amount
      );

    if (!result.success) {
      this.errorMessage = result.message;
      return;
    }

    this.successMessage = result.message;
    this.depositAmounts[goalId] = '';

    this.loadFinanceData();
  }

  startEditing(goal: SavingsGoal): void {
    this.clearMessages();

    this.editingGoalId = goal.id;
    this.editSubmitted = false;

    this.editGoalForm.reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
    });
  }

  cancelEditing(): void {
    this.editingGoalId = null;
    this.editSubmitted = false;

    this.editGoalForm.reset();
  }

  saveEditedGoal(): void {
    this.editSubmitted = true;
    this.clearMessages();

    if (!this.editingGoalId) {
      return;
    }

    if (this.editGoalForm.invalid) {
      this.editGoalForm.markAllAsTouched();
      return;
    }

    const name = String(
      this.editGoalForm.get('name')?.value ?? ''
    );

    const targetAmount = Number(
      this.editGoalForm.get('targetAmount')?.value
    );

    const result = this.savingsService.updateGoal(
      this.editingGoalId,
      name,
      targetAmount
    );

    if (!result.success) {
      this.errorMessage = result.message;
      return;
    }

    this.successMessage = result.message;

    this.editingGoalId = null;
    this.editSubmitted = false;

    this.editGoalForm.reset();
    this.loadFinanceData();
  }

  async confirmDelete(
    goal: SavingsGoal
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete savings goal?',
      message:
        `The $${goal.savedAmount.toFixed(2)} saved in ` +
        `${goal.name} will be returned to your balance.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            const result =
              this.savingsService.deleteGoal(goal.id);

            if (result.success) {
              this.successMessage = result.message;
              this.errorMessage = '';
              this.loadFinanceData();
            } else {
              this.errorMessage = result.message;
              this.successMessage = '';
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getGoalProgress(goal: SavingsGoal): number {
    if (goal.targetAmount <= 0) {
      return 0;
    }

    return Math.min(
      goal.savedAmount / goal.targetAmount,
      1
    );
  }

  getGoalPercent(goal: SavingsGoal): number {
    return Math.round(
      this.getGoalProgress(goal) * 100
    );
  }

  trackByGoalId(
    index: number,
    goal: SavingsGoal
  ): string {
    return goal.id;
  }

  private loadFinanceData(): void {
    this.financeData =
      this.savingsService.getFinanceData();
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
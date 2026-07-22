import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.page.html',
  styleUrls: ['./sign-in.page.scss'],
  standalone: false,
})
export class SignInPage implements OnInit {
  signInForm!: FormGroup;
  showPassword = false;
  loginError = '';
  successMessage = '';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.signInForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    this.route.queryParams.subscribe((params) => {
      if (params['registered'] === 'true') {
        this.successMessage = 'Account created successfully. Please sign in.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onInputChange(event: Event, controlName: string): void {
    const target = event.target as { value?: string; detail?: { value?: string } } | null;
    const value = target?.value ?? target?.detail?.value ?? '';
    this.signInForm.get(controlName)?.setValue(value, { emitEvent: true });
  }

  async onSubmit(): Promise<void> {
  this.submitted = true;
  this.loginError = '';

  if (this.signInForm.invalid) {
    this.signInForm.markAllAsTouched();
    return;
  }

  const username = String(
    this.signInForm.get('username')?.value ?? ''
  ).trim();

  const password = String(
    this.signInForm.get('password')?.value ?? ''
  );

  console.log('Sign In pressed:', username);

  const result = this.authService.login(username, password);

  if (!result.success) {
    this.loginError =
      result.message ?? 'Incorrect username or password';
    return;
  }

  console.log('Login successful:', result.user);

  const navigationSuccessful =
    await this.router.navigateByUrl('/tabs/tab1');

  console.log(
    'Navigation successful:',
    navigationSuccessful
  );
}
  get usernameControl() {
    return this.signInForm.get('username');
  }

  get passwordControl() {
    return this.signInForm.get('password');
  }
}

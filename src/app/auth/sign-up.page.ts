import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: false,
})
export class SignUpPage implements OnInit {
  signUpForm!: FormGroup;
  showPassword = false;
  submitted = false;
  countryCodes = [
    { label: 'Singapore +65', value: '+65' },
    { label: 'Malaysia +60', value: '+60' },
    { label: 'Indonesia +62', value: '+62' },
    { label: 'Philippines +63', value: '+63' },
    { label: 'Thailand +66', value: '+66' },
  ];
  duplicateUsernameError = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.signUpForm = this.fb.group({
      username: ['', Validators.required],
      countryCode: ['+65', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(8), Validators.maxLength(15)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      terms: [false, Validators.requiredTrue],
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onInputChange(event: Event, controlName: string): void {
    const value = (event as CustomEvent).detail?.value ?? (event.target as HTMLInputElement | null)?.value ?? '';
    this.signUpForm.get(controlName)?.setValue(value, { emitEvent: true });
  }

  onSubmit(): void {
    this.submitted = true;
    this.duplicateUsernameError = '';

    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const { username, countryCode, phoneNumber, password } = this.signUpForm.value;
    const registrationResult = this.authService.register({
      username,
      password,
      countryCode,
      phoneNumber,
    });

    if (!registrationResult.success) {
      this.duplicateUsernameError = registrationResult.message || 'Username already exists';
      return;
    }

    this.router.navigate(['/sign-in'], { queryParams: { registered: 'true' } });
  }

  get usernameControl() {
    return this.signUpForm.get('username');
  }

  get phoneNumberControl() {
    return this.signUpForm.get('phoneNumber');
  }

  get passwordControl() {
    return this.signUpForm.get('password');
  }

  get termsControl() {
    return this.signUpForm.get('terms');
  }
}

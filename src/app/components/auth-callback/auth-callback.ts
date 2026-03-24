import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.html',
  styleUrls: ['./auth-callback.scss']
})
export class AuthCallback implements OnInit {
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParams;
    const code: string = params['code'];
    const state: string = params['state'];
    const errorParam: string = params['error'];

    // Google returned an error (e.g. user denied consent)
    if (errorParam) {
      this.error = errorParam === 'access_denied'
        ? 'You denied access. Please try again and allow the requested permissions.'
        : `Google returned an error: ${errorParam}`;
      return;
    }

    if (!code || !state) {
      this.error = 'Invalid callback — missing code or state parameter.';
      return;
    }

    const success = await this.auth.handleCallback(code, state);

    if (success) {
      const redirectUrl = sessionStorage.getItem('auth_redirect_url') || '';
      sessionStorage.removeItem('auth_redirect_url');
      this.router.navigateByUrl(redirectUrl);
    } else {
      this.error = 'Token exchange failed. Please try logging in again.';
    }
  }

  retry(): void {
    this.router.navigate(['/login']);
  }
}
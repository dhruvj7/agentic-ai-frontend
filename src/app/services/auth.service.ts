import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environment';

export interface UserInfo {
  name: string,
  email: string,
  picture: string,
  access_token: string
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEYS = {
    codeVerifier: 'auth_code_verifier',
    state: 'auth_state',
    user: 'auth_user',
  };

  public _user = signal<UserInfo | null>(this.loadUser());
  private _isLoading = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  constructor(private router: Router) {}


  async login(): Promise<void> {
    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    sessionStorage.setItem(this.STORAGE_KEYS.state, state);
    sessionStorage.setItem(this.STORAGE_KEYS.codeVerifier, codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: environment.google.clientId,
      redirect_uri: environment.google.redirectUri,
      scope: environment.google.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    const savedState = sessionStorage.getItem(this.STORAGE_KEYS.state);
    const codeVerifier = sessionStorage.getItem(this.STORAGE_KEYS.codeVerifier);

    if (!savedState || savedState !== state || !codeVerifier) {
      console.error('OAuth state mismatch or missing code verifier');
      return false;
    }

    this._isLoading.set(true);

    try {
      const response = await fetch(`${environment.apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: codeVerifier }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Backend auth failed');
      }

      const user: UserInfo = await response.json();
      this._user.set(user);
      localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(user));

      return true;
    } catch (error) {
      console.error('Auth failed:', error);
      return false;
    } finally {
      this._isLoading.set(false);
      sessionStorage.removeItem(this.STORAGE_KEYS.state);
      sessionStorage.removeItem(this.STORAGE_KEYS.codeVerifier);
    }
  }

  logout(): void {
    Object.values(this.STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    this._user.set(null);
    this.router.navigate(['']);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private loadUser(): UserInfo | null {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values)
      .map((v) => charset[v % charset.length])
      .join('');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
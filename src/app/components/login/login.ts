import { Component } from '@angular/core';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  loading = false;

  constructor(private auth: AuthService) {}

  async login(): Promise<void> {
    this.loading = true;
    await this.auth.login();
  }
}

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
 
  if (auth.isAuthenticated()) {
    return true;
  }
 
  sessionStorage.setItem('auth_redirect_url', state.url);
 
  return router.createUrlTree(['/login']);
};

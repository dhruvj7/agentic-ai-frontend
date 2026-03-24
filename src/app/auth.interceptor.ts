// import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { catchError, throwError } from 'rxjs';
// import { Router } from '@angular/router';
// import { AuthService } from './services/auth.service';
// /**
//  * Attaches the Bearer token to outgoing API requests.
//  * Skips Google OAuth endpoints to avoid circular issues.
//  */
// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const auth = inject(AuthService);
//   const router = inject(Router);

//   // Don't intercept Google OAuth token requests
//   const isAuthEndpoint =
//     req.url.includes('oauth2.googleapis.com') ||
//     req.url.includes('accounts.google.com');

//   const token = auth.getAccessToken();

//   const authReq =
//     token && !isAuthEndpoint
//       ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
//       : req;

//   return next(authReq).pipe(
//     catchError((error: HttpErrorResponse) => {
//       if (error.status === 401) {
//         // Token expired or invalid — redirect to login
//         router.navigate(['/login']);
//       }
//       return throwError(() => error);
//     })
//   );
// };
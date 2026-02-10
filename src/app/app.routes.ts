import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing').then(m => m.Landing) },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat').then(m => m.Chat) },
  { path: 'doctors', loadComponent: () => import('./pages/doctors/doctors').then(m => m.Doctors) },
  { path: 'book-appointment/:id', loadComponent: () => import('./pages/book-appointment/book-appointment').then(m => m.BookAppointment) },
  { path: '**', redirectTo: '' },
];

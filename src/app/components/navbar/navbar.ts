import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private router = inject(Router);
  menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onNavClick(e: Event, sectionId: string): void {
    this.closeMenu();
    const onHome = this.router.url.split('?')[0] === '/' && !this.router.url.includes('?');
    if (onHome) {
      e.preventDefault();
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.router.navigate(['/'], { fragment: sectionId, replaceUrl: true });
    }
  }
}

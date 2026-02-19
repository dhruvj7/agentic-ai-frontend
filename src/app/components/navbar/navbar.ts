import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AutomationService } from '../../services/automation.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private router = inject(Router);
  private automation = inject(AutomationService);
  menuOpen = signal(false);

  // Expose automation state to template
  automationEnabled = this.automation.automationEnabled;

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleAutomation(): void {
    this.automation.toggleAutomation();
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

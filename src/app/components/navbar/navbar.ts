import { Component, signal, inject, afterNextRender } from '@angular/core';
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
  readonly automation = inject(AutomationService);
  menuOpen = signal(false);
  showAutomationInfo = signal(false);

  automationEnabled = this.automation.automationEnabled;
  navigationQueue = this.automation.navigationQueue;
  currentStepIndex = this.automation.currentStepIndex;

  getStepLabel(intent: string): string {
    const labels: Record<string, string> = {
      'doctor_suggestion': 'View Doctors',
      'symptom_analysis': 'Symptom Analysis',
      'hospital_navigation': 'Hospital Navigation',
      'insurance_verification': 'Insurance Verification',
      'insurance_validation': 'Insurance Validation',
    };
    return labels[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  constructor() {
    afterNextRender(() => {
      if (!this.automation.hasSeenIntro()) {
        setTimeout(() => this.showAutomationInfo.set(true), 600);
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openAutomationInfo(): void {
    this.showAutomationInfo.set(true);
    this.closeMenu();
  }

  closeAutomationInfo(): void {
    this.showAutomationInfo.set(false);
    this.automation.markIntroSeen();
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

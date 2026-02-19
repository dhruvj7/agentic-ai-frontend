import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { timer, Subscription } from 'rxjs';
import type { ChatResponse } from './chat-api.service';

export interface NavigationRequest {
  target: string;
  intent: string | string[];
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AutomationService {
  private readonly STORAGE_KEY = 'automation_mode_enabled';
  private readonly NAV_DELAY_MS = 3500;

  private router: Router;

  // Global automation toggle
  private readonly _automationEnabled = signal<boolean>(this.loadInitial());
  readonly automationEnabled = this._automationEnabled.asReadonly();

  // Pending navigation request for confirmation UI in chat
  private readonly _pendingNavigation = signal<NavigationRequest | null>(null);
  readonly pendingNavigation = this._pendingNavigation.asReadonly();

  private navTimerSub?: Subscription;

  constructor(router: Router) {
    this.router = router;
  }

  // --- Public API ---

  enableAutomation(): void {
    this._automationEnabled.set(true);
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  disableAutomation(): void {
    this._automationEnabled.set(false);
    localStorage.setItem(this.STORAGE_KEY, 'false');
  }

  toggleAutomation(): void {
    this._automationEnabled.update(v => {
      const next = !v;
      localStorage.setItem(this.STORAGE_KEY, String(next));
      return next;
    });
  }

  /** Called by chat component after each backend response */
  handleIntent(response: ChatResponse): void {
    const result: any = response.result || {};
    const intents = Array.isArray(response.intent) ? response.intent : [response.intent];

    const requiresNav = !!(result.requires_navigation || result.requiresNavigation);
    const navTarget: string | undefined =
      result.navigation_target || result.navigationTarget || result.nav_target;

    if (!requiresNav || !navTarget) {
      return;
    }

    const req: NavigationRequest = {
      target: navTarget,
      intent: intents,
      message: result.message,
    };

    if (this._automationEnabled()) {
      // Automation ON → auto navigate after delay (no confirmation)
      this.scheduleNavigation(req);
    } else {
      // Automation OFF → show confirmation after a delay
      this.scheduleConfirmation(req);
    }
  }

  /** Chat component calls this when user clicks "Yes, continue" */
  confirmNavigation(): void {
    const req = this._pendingNavigation();
    if (!req) return;
    this.clearPending();
    this.navigateToTarget(req);
  }

  /** Chat component calls this when user clicks "No, stay here" */
  cancelNavigation(): void {
    this.clearPending();
  }

  // --- Internal helpers ---

  private loadInitial(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'true';
  }

  private clearPending(): void {
    this._pendingNavigation.set(null);
    if (this.navTimerSub) {
      this.navTimerSub.unsubscribe();
      this.navTimerSub = undefined;
    }
  }

  private scheduleNavigation(req: NavigationRequest): void {
    this.clearPending();
    this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => {
      this.navigateToTarget(req);
    });
  }

  private scheduleConfirmation(req: NavigationRequest): void {
    this.clearPending();
    this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => {
      this._pendingNavigation.set(req);
    });
  }

  private navigateToTarget(req: NavigationRequest): void {
    const target = (req.target || '').toLowerCase();

    if (target === 'insurance') {
      this.router.navigate(['/insurance']);
      return;
    }
    if (target === 'doctors' || target === 'doctor_list') {
      this.router.navigate(['/doctors']);
      return;
    }
    if (target === 'chat') {
      this.router.navigate(['/chat']);
      return;
    }

    // Fallback: treat as path segment
    this.router.navigate(['/', target]);
  }
}


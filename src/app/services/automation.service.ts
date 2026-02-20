import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { timer, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { ChatResponse, SubResult } from './chat-api.service';
import { DoctorMatchService } from './doctor-match.service';
import type { Doctor } from '../models/doctor.model';

export interface NavigationRequest {
  target: string;
  intent: string | string[];
  message?: string;
  /** For doctors → booking flow: pre-selected doctor and slot */
  doctor?: Doctor;
  slot?: { id: number; slot_date: string; slot_time: string };
  /** For hospital navigation: destination name */
  destination?: string;
}

export interface NavigationStep {
  id: string;
  intent: string;
  target: string;
  message?: string;
  priority: number;
  data?: any; // Additional data like doctor, slot, destination
  completed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AutomationService {
  private readonly STORAGE_KEY = 'automation_mode_enabled';
  private readonly INTRO_SEEN_KEY = 'automation_intro_seen';
  private readonly NAV_DELAY_MS = 3500;
  private readonly STEP_COMPLETION_DELAY_MS = 2000; // Wait 2s after step completion before next

  private router = inject(Router);
  private doctorMatch = inject(DoctorMatchService);

  /** Global automation toggle */
  private readonly _automationEnabled = signal<boolean>(this.loadInitial());
  readonly automationEnabled = this._automationEnabled.asReadonly();

  /** Navigation step queue for sequential multi-step navigation */
  private readonly _navigationQueue = signal<NavigationStep[]>([]);
  readonly navigationQueue = this._navigationQueue.asReadonly();

  /** Current active step index */
  private readonly _currentStepIndex = signal<number>(-1);
  readonly currentStepIndex = this._currentStepIndex.asReadonly();

  /** Pending navigation for confirmation (when automation OFF) */
  private readonly _pendingNavigation = signal<NavigationRequest | null>(null);
  readonly pendingNavigation = this._pendingNavigation.asReadonly();

  /** Slot confirmation on doctors page: "Book Dr. X on date at time?" */
  private readonly _pendingSlotConfirmation = signal<NavigationRequest | null>(null);
  readonly pendingSlotConfirmation = this._pendingSlotConfirmation.asReadonly();

  /** Pending step transition modal (shows step info - first step or next step) */
  private readonly _pendingStepTransition = signal<{ step: NavigationStep; isInitial: boolean } | null>(null);
  readonly pendingStepTransition = this._pendingStepTransition.asReadonly();

  private navTimerSub?: Subscription;
  private stepCompletionSub?: Subscription;
  private routerSub?: Subscription;

  constructor() {
    // Listen to route changes to detect step completion
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this._automationEnabled() && this._navigationQueue().length > 0) {
          // Check if current step is completed based on route
          this.checkStepCompletion();
        }
      });
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

  /** Chat calls this after each backend response */
  handleIntent(response: ChatResponse): void {
    const result: any = response.result || {};
    const intents = Array.isArray(response.intent) ? response.intent : [response.intent];
    const userInput = (response.user_input || '').toLowerCase();

    // Analyze and extract all navigation steps from the response
    const steps = this.analyzeAndExtractSteps(response, result, intents, userInput);

    if (steps.length === 0) {
      // Fallback to old single-step logic
      this.handleSingleStepNavigation(response, result, intents, userInput);
      return;
    }

    // If we have multiple steps, queue them for sequential navigation
    if (steps.length > 1) {
      this._navigationQueue.set(steps);
      this._currentStepIndex.set(0);
      this.startSequentialNavigation();
    } else if (steps.length === 1) {
      // Single step - show popup modal for booking steps, otherwise use old flow
      const step = steps[0];
      if ((step.target === 'book-appointment' || step.target === 'booking' || step.intent === 'appointment_booking') && this._automationEnabled()) {
        // Show popup modal for booking steps when auto-navigate is ON
        this._navigationQueue.set([step]);
        this._currentStepIndex.set(0);
        this.startSequentialNavigation();
      } else {
        // Use old flow for other steps
        this.scheduleOrConfirm({
          target: step.target,
          intent: step.intent,
          message: step.message,
          ...step.data,
        });
      }
    }
  }

  /** Analyze response to extract all navigation steps in logical order */
  private analyzeAndExtractSteps(
    response: ChatResponse,
    result: any,
    intents: string[],
    userInput: string
  ): NavigationStep[] {
    const steps: NavigationStep[] = [];
    const subResults = result.sub_results || [];
    
    // Collect all intents from main and sub_results
    const allIntents = new Set<string>([...intents.map((i: string) => String(i).toLowerCase())]);
    subResults.forEach((sr: SubResult) => {
      const si = String(sr?.intent || '').toLowerCase();
      if (si) allIntents.add(si);
    });

    // Check for symptom analysis / doctor suggestion (show doctors first)
    const hasSymptomAnalysis = allIntents.has('symptom_analysis') || allIntents.has('doctor_suggestion');
    if (hasSymptomAnalysis) {
      let doctors: any[] = [];
      // Find doctors from sub_results or main result
      for (const sr of subResults) {
        const md = sr.care_options?.matched_doctors;
        if (Array.isArray(md) && md.length) {
          doctors = md;
          break;
        }
      }
      if (!doctors.length && result.doctors?.length) {
        doctors = result.doctors;
      }
      if (!doctors.length && result.care_options?.matched_doctors?.length) {
        doctors = result.care_options.matched_doctors;
      }

      if (doctors.length) {
        // Enhanced detection for booking intent
        const wantsBook = userInput.includes('book') || 
                          userInput.includes('first available') || 
                          userInput.includes('first slot') ||
                          userInput.includes('first doctor') ||
                          (userInput.includes('first') && (userInput.includes('doctor') || userInput.includes('slot')));
        const firstDoctor = this.normalizeDoctor(doctors[0]);
        const firstSlot = wantsBook ? this.getFirstSlot(firstDoctor) : null;

        // If user wants to book first doctor/first slot and auto-navigate is ON, skip doctors page and go directly to booking
        if (wantsBook && firstSlot && this._automationEnabled()) {
          // Add a booking step that directly navigates to booking page
          steps.push({
            id: 'booking',
            intent: 'appointment_booking',
            target: 'book-appointment',
            message: 'Booking your appointment with the first available doctor.',
            priority: 1,
            data: {
              doctor: firstDoctor,
              slot: { id: firstSlot.id, slot_date: firstSlot.slot_date, slot_time: firstSlot.slot_time },
            },
            completed: false,
          });
        } else {
          steps.push({
            id: 'doctors',
            intent: 'doctor_suggestion',
            target: 'doctors',
            message: 'Let me show you available doctors.',
            priority: 1,
            data: wantsBook && firstSlot ? {
              doctor: firstDoctor,
              slot: { id: firstSlot.id, slot_date: firstSlot.slot_date, slot_time: firstSlot.slot_time },
            } : undefined,
            completed: false,
          });
        }
      }
    }

    // Check for hospital navigation (cafeteria, etc.)
    const hasHospitalNav = allIntents.has('hospital_navigation') || result.navigation;
    if (hasHospitalNav) {
      const navSubResult = subResults.find((sr: SubResult) => sr.intent === 'hospital_navigation');
      const navData = result.navigation || navSubResult?.navigation;
      // Extract destination from multiple sources
      let destination = navData?.destination?.name;
      if (!destination) {
        // Try extracting from sub_result message (e.g., "I couldn't find 'cafetaria'")
        destination = this.extractDestinationFromMessage(navSubResult?.message || '');
      }
      if (!destination) {
        // Try extracting from user input
        destination = this.extractDestinationFromInput(userInput);
      }
      
      // Always add hospital navigation step if intent exists, even if destination is null
      // The UI will show the "couldn't find" message with suggestions
      steps.push({
        id: 'hospital_nav',
        intent: 'hospital_navigation',
        target: 'chat', // Hospital nav is shown in chat, not a separate route
        message: destination ? `Navigating you to ${destination}.` : (navSubResult?.message || 'Let me help you navigate.'),
        priority: 2,
        data: { destination: destination || undefined, navigation: navData },
        completed: false,
      });
    }

    // Check for insurance verification (usually last)
    const hasInsurance =
      allIntents.has('insurance_verification') ||
      allIntents.has('insurance_validation') ||
      /insurance|verify.*insurance|check.*insurance|validate.*insurance/i.test(userInput);
    if (hasInsurance) {
      steps.push({
        id: 'insurance',
        intent: 'insurance_verification',
        target: 'insurance',
        message: 'Let me help you verify your insurance.',
        priority: 3,
        completed: false,
      });
    }

    // Sort by priority (lower number = higher priority)
    return steps.sort((a, b) => a.priority - b.priority);
  }

  /** Extract destination name from user input */
  private extractDestinationFromInput(input: string): string | undefined {
    // Include common misspellings and variations
    const destinations = [
      'cafeteria', 'cafetaria', 'cafe', 'café',
      'pharmacy', 'pharmacist',
      'emergency', 'er', 'emergency room',
      'reception', 'receptionist',
      'lobby', 'main entrance',
      'bathroom', 'restroom', 'washroom',
      'laboratory', 'lab',
      'waiting room', 'waiting area',
      'cabin', 'smith', 'smiths cabin', 'smith\'s cabin'
    ];
    const lower = input.toLowerCase();
    for (const dest of destinations) {
      if (lower.includes(dest)) {
        // Return properly capitalized version
        if (dest === 'cafetaria') return 'Cafeteria';
        if (dest === 'er') return 'Emergency Room';
        if (dest === 'main entrance') return 'Main Entrance';
        if (dest === 'waiting room' || dest === 'waiting area') return 'Waiting Room';
        return dest.charAt(0).toUpperCase() + dest.slice(1);
      }
    }
    return undefined;
  }

  /** Extract destination name from backend message (e.g., "I couldn't find 'cafetaria'") */
  private extractDestinationFromMessage(message: string): string | undefined {
    if (!message) return undefined;
    
    // Look for quoted strings in the message (e.g., "I couldn't find 'cafetaria'")
    const quotedMatch = message.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) {
      const quoted = quotedMatch[1].toLowerCase();
      // Normalize common misspellings
      if (quoted.includes('cafetaria')) return 'Cafeteria';
      return this.extractDestinationFromInput(quoted);
    }
    
    // Fallback: try extracting from message text
    return this.extractDestinationFromInput(message);
  }

  /** Fallback to old single-step navigation logic */
  private handleSingleStepNavigation(
    response: ChatResponse,
    result: any,
    intents: string[],
    userInput: string
  ): void {
    // Explicit backend fields
    const explicitNav = result.requires_navigation || result.requiresNavigation;
    const explicitTarget = result.navigation_target || result.navigationTarget || result.nav_target;
    if (explicitNav && explicitTarget) {
      this.scheduleOrConfirm({ target: explicitTarget, intent: intents, message: result.message });
      return;
    }

    // Simple intent-based navigation (old logic)
    const allIntents = new Set<string>([...intents.map((i: string) => String(i).toLowerCase())]);
    const wantsInsurance = allIntents.has('insurance_verification') || allIntents.has('insurance_validation');
    const wantsDoctors = allIntents.has('symptom_analysis') || allIntents.has('doctor_suggestion');
    // Enhanced detection for booking intent - check for phrases like "first doctor", "first slot", "book appointment"
    const wantsBook = userInput.includes('book') || 
                      userInput.includes('first available') || 
                      userInput.includes('first slot') ||
                      userInput.includes('first doctor') ||
                      (userInput.includes('first') && (userInput.includes('doctor') || userInput.includes('slot')));

    if (wantsInsurance) {
      this.scheduleOrConfirm({
        target: 'insurance',
        intent: intents,
        message: 'I can help you verify your insurance.',
      });
      return;
    }

    if (wantsDoctors) {
      const subResults = result.sub_results || [];
      let doctors: any[] = [];
      for (const sr of subResults) {
        const md = sr.care_options?.matched_doctors;
        if (Array.isArray(md) && md.length) {
          doctors = md;
          break;
        }
      }
      if (!doctors.length && result.doctors?.length) {
        doctors = result.doctors;
      }
      if (!doctors.length && result.care_options?.matched_doctors?.length) {
        doctors = result.care_options.matched_doctors;
      }

      if (doctors.length) {
        const firstDoctor = this.normalizeDoctor(doctors[0]);
        const firstSlot = wantsBook ? this.getFirstSlot(firstDoctor) : null;

        if (wantsBook && firstSlot) {
          // If auto-navigate is ON, show popup modal then navigate to booking page
          if (this._automationEnabled()) {
            // Create a booking step and show popup modal
            const bookingStep: NavigationStep = {
              id: 'booking',
              intent: 'appointment_booking',
              target: 'book-appointment',
              message: 'Booking your appointment with the first available doctor.',
              priority: 1,
              data: {
                doctor: firstDoctor,
                slot: { id: firstSlot.id, slot_date: firstSlot.slot_date, slot_time: firstSlot.slot_time },
              },
              completed: false,
            };
            this._navigationQueue.set([bookingStep]);
            this._currentStepIndex.set(0);
            this.startSequentialNavigation();
          } else {
            // Auto-navigate is OFF - show confirmation modal on doctors page
            this._pendingSlotConfirmation.set({
              target: 'doctors',
              intent: intents,
              doctor: firstDoctor,
              slot: { id: firstSlot.id, slot_date: firstSlot.slot_date, slot_time: firstSlot.slot_time },
            });
            this.scheduleOrConfirm({
              target: 'doctors',
              intent: intents,
              doctor: firstDoctor,
              slot: { id: firstSlot.id, slot_date: firstSlot.slot_date, slot_time: firstSlot.slot_time },
            });
          }
        } else {
          this.scheduleOrConfirm({
            target: 'doctors',
            intent: intents,
          });
        }
      }
    }
  }

  /** Start sequential navigation through the queue */
  private startSequentialNavigation(): void {
    const queue = this._navigationQueue();
    const currentIdx = this._currentStepIndex();
    
    if (currentIdx < 0 || currentIdx >= queue.length) {
      this._navigationQueue.set([]);
      this._currentStepIndex.set(-1);
      this._pendingStepTransition.set(null);
      return;
    }

    const currentStep = queue[currentIdx];
    if (currentStep.completed) {
      // Move to next step
      this.proceedToNextStep();
      return;
    }

    // Show informative popup first (for both first step and between steps)
    if (this._automationEnabled()) {
      this.clearPending();
      this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => {
        const isInitial = currentIdx === 0 && !currentStep.completed;
        this._pendingStepTransition.set({ step: currentStep, isInitial });
      });
    } else {
      // Show confirmation bubble when automation off
      this.clearPending();
      this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => {
        this._pendingNavigation.set({
          target: currentStep.target,
          intent: currentStep.intent,
          message: currentStep.message,
          ...currentStep.data,
        });
      });
    }
  }

  /** Navigate to a specific step */
  private navigateToStep(step: NavigationStep): void {
    if (step.target === 'chat' && step.intent === 'hospital_navigation') {
      // Hospital navigation is shown in chat UI
      const currentRoute = this.router.url.split('?')[0];
      if (currentRoute !== '/chat') {
        this.router.navigate(['/chat']);
      }
      // If no route (destination not found), auto-complete after delay so flow continues to insurance
      const hasRoute = step.data?.navigation?.route?.steps?.length;
      if (!hasRoute) {
        setTimeout(() => this.markStepCompleted('hospital_nav'), 6000);
      }
      return;
    }

    this.navigateToTarget({
      target: step.target,
      intent: step.intent,
      message: step.message,
      ...step.data,
    });
  }

  /** Check if current step is completed based on route */
  private checkStepCompletion(): void {
    const queue = this._navigationQueue();
    const currentIdx = this._currentStepIndex();
    
    if (currentIdx < 0 || currentIdx >= queue.length) return;

    const currentStep = queue[currentIdx];
    const currentRoute = this.router.url.split('?')[0];

    // Check if we're on the target route
    if (currentStep.target === 'doctors' && currentRoute === '/doctors') {
      // Step completed when user reaches doctors page
      setTimeout(() => this.markStepCompleted(currentStep.id), 1000);
    } else if (currentStep.target === 'insurance' && currentRoute === '/insurance') {
      // Step completed when user reaches insurance page
      setTimeout(() => this.markStepCompleted(currentStep.id), 1000);
    } else if ((currentStep.target === 'book-appointment' || currentStep.target === 'booking') && currentRoute.startsWith('/book-appointment')) {
      // Step completed when user reaches booking page
      setTimeout(() => this.markStepCompleted(currentStep.id), 1000);
    }
  }

  /** Mark a step as completed and proceed to next */
  markStepCompleted(stepId?: string): void {
    const queue = this._navigationQueue();
    const currentIdx = this._currentStepIndex();
    
    if (currentIdx < 0 || currentIdx >= queue.length) return;

    const step = queue[currentIdx];
    // If stepId provided, verify it matches current step
    if (stepId && step.id !== stepId) return;

    // Mark as completed
    const updatedQueue = queue.map((s, idx) =>
      idx === currentIdx ? { ...s, completed: true } : s
    );
    this._navigationQueue.set(updatedQueue);

    // Proceed to next step after delay
    if (this.stepCompletionSub) {
      this.stepCompletionSub.unsubscribe();
    }
    this.stepCompletionSub = timer(this.STEP_COMPLETION_DELAY_MS).subscribe(() => {
      this.proceedToNextStep();
    });
  }

  /** Proceed to the next step in the queue */
  private proceedToNextStep(): void {
    const queue = this._navigationQueue();
    const currentIdx = this._currentStepIndex();
    
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) {
      // All steps completed
      this._navigationQueue.set([]);
      this._currentStepIndex.set(-1);
      this._pendingStepTransition.set(null);
      return;
    }

    const nextStep = queue[nextIdx];
    
    // Show transition modal before navigating to next step
    this._pendingStepTransition.set({ step: nextStep, isInitial: false });
  }

  /** User confirms and navigates (first step or next step) */
  confirmStepAndNavigate(): void {
    const pending = this._pendingStepTransition();
    if (!pending) return;

    const { step, isInitial } = pending;
    this._pendingStepTransition.set(null);

    if (isInitial) {
      // First step - navigate to step at current index
      this.navigateToStep(step);
    } else {
      // Between steps - increment and navigate
      const queue = this._navigationQueue();
      const currentIdx = this._currentStepIndex();
      const nextIdx = currentIdx + 1;
      
      if (nextIdx < queue.length) {
        this._currentStepIndex.set(nextIdx);
        this.navigateToStep(step);
      }
    }
  }

  /** User chooses to proceed to next step (alias for confirmStepAndNavigate) */
  proceedToNextStepConfirmed(): void {
    this.confirmStepAndNavigate();
  }

  /** User chooses to stay on current step */
  stayOnCurrentStep(): void {
    this._pendingStepTransition.set(null);
  }

  /** Manually mark step as completed (called by pages) */
  completeCurrentStep(): void {
    const queue = this._navigationQueue();
    const currentIdx = this._currentStepIndex();
    
    if (currentIdx >= 0 && currentIdx < queue.length && !queue[currentIdx].completed) {
      this.markStepCompleted();
    }
  }

  confirmNavigation(): void {
    const req = this._pendingNavigation();
    if (!req) return;
    this.clearPending();
    this.navigateToTarget(req);
  }

  cancelNavigation(): void {
    this.clearPending();
  }

  /** Doctors page: user confirms slot → go to booking */
  confirmSlotAndNavigateToBooking(): void {
    const req = this._pendingSlotConfirmation() || this._pendingNavigation();
    if (!req?.doctor || !req?.slot) return;
    this._pendingSlotConfirmation.set(null);
    this.clearPending();
    this.router.navigate(['/book-appointment', req.doctor.id], {
      queryParams: { slotId: req.slot.id, doctorId: req.doctor.id },
    });
  }

  /** Doctors page: user declines auto-selected slot */
  cancelSlotConfirmation(): void {
    this._pendingSlotConfirmation.set(null);
  }

  // --- Internal ---

  private loadInitial(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'true';
  }

  /** Whether the first-visit intro popup has been shown/dismissed */
  hasSeenIntro(): boolean {
    return localStorage.getItem(this.INTRO_SEEN_KEY) === 'true';
  }

  markIntroSeen(): void {
    localStorage.setItem(this.INTRO_SEEN_KEY, 'true');
  }

  private clearPending(): void {
    this._pendingNavigation.set(null);
    if (this.navTimerSub) {
      this.navTimerSub.unsubscribe();
      this.navTimerSub = undefined;
    }
  }

  private scheduleOrConfirm(req: NavigationRequest): void {
    if (this._automationEnabled()) {
      this.clearPending();
      this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => this.navigateToTarget(req));
    } else {
      this.clearPending();
      this.navTimerSub = timer(this.NAV_DELAY_MS).subscribe(() => this._pendingNavigation.set(req));
    }
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
    if (target === 'book-appointment' || target === 'booking') {
      // Navigate directly to booking page with doctor and slot info
      if (req.doctor && req.slot) {
        this.router.navigate(['/book-appointment', req.doctor.id], {
          queryParams: { slotId: req.slot.id, doctorId: req.doctor.id },
        });
      } else {
        // Fallback to doctors page if no doctor/slot specified
        this.router.navigate(['/doctors']);
      }
      return;
    }
    if (target === 'chat') {
      // If already on chat, just scroll to show navigation
      if (this.router.url.includes('/chat')) {
        // Navigation will be shown in chat UI
        return;
      }
      this.router.navigate(['/chat']);
      return;
    }
    this.router.navigate(['/', target]);
  }

  /** Cleanup subscriptions */
  ngOnDestroy(): void {
    if (this.navTimerSub) {
      this.navTimerSub.unsubscribe();
    }
    if (this.stepCompletionSub) {
      this.stepCompletionSub.unsubscribe();
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  private normalizeDoctor(d: any): Doctor {
    const slots = (d.slots || d.available_slots || [])
      .map((s: any) => ({ id: s.id, slot_date: s.slot_date, slot_time: s.slot_time }));
    return {
      id: Number(d.id),
      name: d.name,
      email: d.email,
      specialty: d.specialty,
      department: d.department,
      qualification: d.qualification,
      experience: d.experience,
      rating: d.rating,
      imageUrl: d.imageUrl || d.image_url,
      slots: slots.length ? slots : undefined,
    };
  }

  private getFirstSlot(doctor: Doctor): { id: number; slot_date: string; slot_time: string } | null {
    const slots = doctor.slots;
    if (!slots?.length) return null;
    const s = slots[0];
    return { id: s.id, slot_date: s.slot_date, slot_time: s.slot_time };
  }
}

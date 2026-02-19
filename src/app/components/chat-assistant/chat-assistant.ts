import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnInit,
  effect
} from '@angular/core';
import { Router } from '@angular/router';
import { ChatApiService, ChatResponse } from '../../services/chat-api.service';
import { ChatMessage, MessageContent } from '../../models/chat-message.model';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { ChatStateService } from '../../services/chat-state.service';
import { ChangeDetectorRef } from '@angular/core';
import { Doctor } from '../../models/doctor.model';
import { AutomationService } from '../../services/automation.service';

@Component({
  selector: 'app-chat-assistant',
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
})
export class ChatAssistant implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(private cdr: ChangeDetectorRef) {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        this.chatState.save(msgs, this.sessionId);
      }
    });
  }

  startNavigation(msg: any) {
  const route = msg.content.navigation?.route;
  if (!route || !route.steps) {
    // No route available (destination not found) - still mark step as completed
    // User has seen the "couldn't find" message with suggestions
    this.automation.markStepCompleted('hospital_nav');
    return;
  }

  const steps = route.steps;

  // Reset this message only
  msg.content.currentStepIndex = 0;

  // Clear existing interval if restarting
  if (msg.content.navigationInterval) {
    clearInterval(msg.content.navigationInterval);
  }

  // Mark hospital navigation step as completed when user starts navigation
  this.automation.markStepCompleted('hospital_nav');

  msg.content.navigationInterval = setInterval(() => {
    if (msg.content.currentStepIndex < steps.length - 1) {
      msg.content.currentStepIndex++;
      this.cdr.detectChanges();
    } else {
      clearInterval(msg.content.navigationInterval);
    }
  }, 2000);
}

  startNavigationFromSubResult(subResult: any, subResultIndex: number) {
    const route = subResult.navigation?.route;
    if (!route || !route.steps) {
      // No route available (destination not found) - still mark step as completed
      this.automation.markStepCompleted('hospital_nav');
      return;
    }

    const steps = route.steps;

    // Initialize currentStepIndex if not exists
    if (subResult.currentStepIndex === undefined) {
      subResult.currentStepIndex = 0;
    } else {
      subResult.currentStepIndex = 0; // Reset
    }

    // Clear existing interval if restarting
    if (subResult.navigationInterval) {
      clearInterval(subResult.navigationInterval);
    }

    // Mark hospital navigation step as completed when user starts navigation
    this.automation.markStepCompleted('hospital_nav');

    subResult.navigationInterval = setInterval(() => {
      if (subResult.currentStepIndex < steps.length - 1) {
        subResult.currentStepIndex++;
        this.cdr.detectChanges();
      } else {
        clearInterval(subResult.navigationInterval);
      }
    }, 2000);
  }

  private chatApi = inject(ChatApiService);
  private doctorMatch = inject(DoctorMatchService);
  private router = inject(Router);
  private chatState = inject(ChatStateService);
  readonly automation = inject(AutomationService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly inputValue = signal('');
  readonly isTyping = signal(false);
  readonly assistantName = 'AI Care Navigator';
  private _sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  private get sessionId(): string {
    return this._sessionId;
  }

  private scrollToBottom = false;
  private userAge = 35; // Could come from user profile
  private userLocation = 'hospital_lobby'; // Could be dynamic

  ngOnInit(): void {
    if (this.chatState.hasStoredState()) {
      const stored = this.chatState.getMessages();
      const sid = this.chatState.getSessionId();
      if (stored.length > 0) {
        this.messages.set(stored);
        this.scrollToBottom = true;
      }
      if (sid) {
        this._sessionId = sid;
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.scrollToBottom && this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.scrollToBottom = false;
    }
  }

  onInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.inputValue.set(target?.value ?? '');
  }

  send(): void {
    const text = this.inputValue().trim();
    if (!text) return;

    // Add user message
    this.messages.update(m => [...m, {
      role: 'user',
      content: { type: 'text', text },
      timestamp: new Date()
    }]);

    this.inputValue.set('');
    this.scrollToBottom = true;
    this.isTyping.set(true);

    // Call backend API
    this.chatApi.sendMessage({
      context: {
        location: this.userLocation,
        user_age: this.userAge
      },
      message: text,
      session_id: this.sessionId
    }).subscribe({
      next: (response) => {
        console.log("response--",response)
        this.handleResponse(response);
      },
      error: (error) => {
        console.error('Chat API error:', error);
        this.isTyping.set(false);
        this.messages.update(m => [...m, {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'Sorry, I encountered an error. Please try again.'
          },
          timestamp: new Date()
        }]);
        this.scrollToBottom = true;
      }
    });
  }

  private handleResponse(response: ChatResponse): void {
    this.isTyping.set(false);

    const content: MessageContent = this.parseResponseContent(response);
    console.log("content--",content)

    this.messages.update(m => [...m, {
      role: 'assistant',
      content,
      timestamp: new Date(),
      intent: response.intent
    }]);

    // Store matched doctors if available (from content or sub_results for multi_intent)
    let doctorsToSet = content.careOptions?.matched_doctors;
    if (!doctorsToSet && content.subResults) {
      const firstWithDoctors = content.subResults.find(sr => sr.careOptions?.matched_doctors?.length);
      doctorsToSet = firstWithDoctors?.careOptions?.matched_doctors;
    }
    if (doctorsToSet?.length) {
      const normalized = this.transformDoctors(doctorsToSet as any);
      if (normalized.length) {
        this.doctorMatch.setMatchedDoctors(normalized);
      }
    }

    // Let automation layer inspect intents (navigation, etc.)
    this.automation.handleIntent(response);

    this.scrollToBottom = true;
  }

  /**
   * Transform API doctor format to frontend format
   * Maps available_slots to slots and normalizes slot structure
   */
  private transformDoctors(doctors: any[]): Doctor[] {
    if (!Array.isArray(doctors)) return [];

    return doctors.map(doctor => {
      const transformed: Doctor = {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        department: doctor.department,
        qualification: doctor.qualification,
        experience: doctor.experience,
        rating: doctor.rating,
        imageUrl: doctor.imageUrl || doctor.image_url,
      };

      // Map available_slots to slots
      if (doctor.available_slots && Array.isArray(doctor.available_slots)) {
        transformed.slots = doctor.available_slots.map((slot: any) => ({
          id: slot.id,
          slot_date: slot.slot_date,
          slot_time: slot.slot_time,
        }));
      } else if (doctor.slots && Array.isArray(doctor.slots)) {
        // Already in correct format
        transformed.slots = doctor.slots.map((slot: any) => ({
          id: slot.id,
          slot_date: slot.slot_date,
          slot_time: slot.slot_time,
        }));
      }

      return transformed;
    });
  }

  private parseResponseContent(response: ChatResponse): MessageContent {
    const { result, intent } = response;

    const resolveInsuranceHint = (r: { intent?: string | string[]; resultIntent?: string; available_endpoints?: Record<string, string> }): { requires: boolean; link?: string } => {
      const intentStr = Array.isArray(r.intent) ? (r.intent.includes('insurance_verification') || r.intent.includes('insurance_validation') ? 'insurance' : (r.intent[0] ?? '')) : (r.intent ?? '');
      const resultIntent = r.resultIntent ?? '';
      const isInsuranceIntent =
        intentStr === 'insurance_verification' || intentStr === 'insurance_validation' ||
        intentStr === 'validate_insurance' || intentStr === 'insurance' ||
        resultIntent === 'insurance_verification' || resultIntent === 'insurance_validation';
      const link = r.available_endpoints?.['insurance'] ?? r.available_endpoints?.['insurance_validation'] ?? r.available_endpoints?.['insurance_verification'];
      return { requires: isInsuranceIntent || !!link, link };
    };

    // Handle multi-intent responses
    if (Array.isArray(intent) && result.sub_results) {
      const subResults = result.sub_results.map(sr => {
        const insurance = resolveInsuranceHint({
          intent: sr.intent,
          resultIntent: sr.intent,
          available_endpoints: sr.available_endpoints
        });

        const transformedCareOptions = sr.care_options?.matched_doctors
          ? {
              ...sr.care_options,
              // Ensure doctors in chat UI always have `slots` populated from `available_slots`
              matched_doctors: this.transformDoctors(sr.care_options.matched_doctors) as any
            }
          : sr.care_options;

        return {
          intent: sr.intent,
          message: sr.message,
          analysis: sr.analysis,
          recommendations: sr.recommendations,
          careOptions: transformedCareOptions,
          bookingFlow: sr.booking_flow,
          instructions: sr.instructions,
          nextSteps: sr.next_steps,
          requiresInsuranceValidation: insurance.requires,
          insuranceLink: insurance.link,
          navigation: sr.navigation, // Include navigation data for hospital_navigation
          currentStepIndex: -1 // Initialize step index for navigation
        };
      });
      const hasInsurance = subResults.some(sr => sr.requiresInsuranceValidation);
      const firstInsuranceLink = subResults.find(sr => sr.insuranceLink)?.insuranceLink;
      const hasDoctorCards = subResults.some(sr => sr.careOptions?.matched_doctors?.length);
      // Use short intro when we show doctor cards to avoid raw formatted list
      const introText = hasDoctorCards
        ? 'Based on your request, here is what I found.'
        : result.message;
      return {
        type: 'multi_intent',
        text: introText,
        subResults,
        requiresInsuranceValidation: hasInsurance,
        insuranceLink: firstInsuranceLink ?? (hasInsurance ? '/insurance' : undefined)
      };
    }

    // Handle insurance_verification with verification_result (success or failure)
    const verificationResult = result['verification_result'] as { is_verified?: boolean; verification_status?: string; verification_details?: object; errors?: string[]; message?: string } | undefined;
    const rootInsurance = resolveInsuranceHint({
      intent,
      resultIntent: result.intent,
      available_endpoints: result.available_endpoints
    });
    if (rootInsurance.requires && verificationResult) {
      return {
        type: 'insurance_verification_result',
        text: result.message,
        insuranceVerificationSuccess: verificationResult.is_verified === true,
        verificationResult: verificationResult as any,
        nextSteps: result['next_steps'],
        requiresInsuranceValidation: !verificationResult.is_verified,
        insuranceLink: '/insurance'
      };
    }
    // Handle insurance_verification (needs more info - show add insurance button)
    if (rootInsurance.requires) {
      return {
        type: 'insurance_validation',
        text: result.message,
        requiresInsuranceValidation: true,
        insuranceLink: rootInsurance.link ?? '/insurance',
        instructions: result.instructions ?? (result['follow_up_questions']?.length ? result['follow_up_questions'] : undefined)
      };
    }

    // Handle single intent responses
    if (intent === 'symptom_analysis' || result.intent === 'symptom_analysis') {
      const transformedCareOptions = result.care_options?.matched_doctors
        ? {
            ...result.care_options,
            matched_doctors: this.transformDoctors(result.care_options.matched_doctors) as any
          }
        : result.care_options;
      // Avoid raw formatted doctor list; use short intro when we have doctor cards
      const hasDoctors = !!transformedCareOptions?.matched_doctors?.length;
      const symptomText = hasDoctors
        ? 'Based on your symptoms, here is my analysis and recommended doctors.'
        : result.message;

      return {
        type: 'symptom_analysis',
        text: symptomText,
        analysis: result.analysis,
        recommendations: result.recommendations,
        careOptions: transformedCareOptions,
        nextSteps: result.next_steps
      };
    }

    if (intent === 'appointment_booking' || result.intent === 'appointment_booking') {
      return {
        type: 'appointment_booking',
        text: result.message,
        bookingFlow: result.booking_flow,
        instructions: result.instructions
      };
    }

    if (intent === 'hospital_navigation' || result.intent === 'hospital_navigation') {
      return {
        type: 'hospital_navigation',
        text: result.message,
        navigation: result.navigation,
        instructions: result.instructions,
        currentStepIndex: -1
      };
    }

    // Doctor suggestion / list - use clean card UI, never show raw formatted message
    const doctorsFromRoot = result['doctors'] ?? result.care_options?.matched_doctors;
    const isDoctorIntent =
      intent === 'doctor_suggestion' || result.intent === 'doctor_suggestion' ||
      (Array.isArray(intent) && intent.includes('doctor_suggestion'));
    if ((isDoctorIntent || doctorsFromRoot?.length) && Array.isArray(doctorsFromRoot) && doctorsFromRoot.length) {
      const normalized = this.transformDoctors(doctorsFromRoot);
      const specialty = result['specialty'] as string | undefined;
      const cleanIntro = specialty
        ? `Here are ${normalized.length} ${specialty} doctor${normalized.length === 1 ? '' : 's'} we found.`
        : `Here are the ${normalized.length} doctor${normalized.length === 1 ? '' : 's'} you asked for.`;
      return {
        type: 'doctor_list',
        text: cleanIntro,
        careOptions: {
          matched_doctors: normalized as any,
          suggested_specialties: specialty ? [specialty] : []
        }
      };
    }

    // Default text response - check if API included insurance link/validation hint
    const defaultInsurance = resolveInsuranceHint({ intent: '', resultIntent: result.intent, available_endpoints: result.available_endpoints });
    return {
      type: 'text',
      text: result.message,
      ...(defaultInsurance.requires && {
        requiresInsuranceValidation: true,
        insuranceLink: defaultInsurance.link ?? '/insurance'
      })
    };
  }

  viewMatchedDoctors(): void {
    this.router.navigate(['/doctors']);
  }

  hasInsuranceOnlyAtTopLevel(content: MessageContent): boolean {
    if (!content.requiresInsuranceValidation) return false;
    const subs = content.subResults ?? [];
    return !subs.some((sr) => sr.requiresInsuranceValidation);
  }

  goToInsurance(link?: string): void {
    const path = link ?? '/insurance';
    if (path.startsWith('/')) {
      this.router.navigateByUrl(path);
    } else {
      window.open(path, '_blank');
    }
  }

  selectDoctor(doctor: any): void {
    const [normalized] = this.transformDoctors([doctor]);
    if (normalized) {
      this.doctorMatch.setMatchedDoctors([normalized]);
    }
    this.router.navigate(['/doctors']);
  }

  expandSection(section: string): void {
    // Toggle section expansion if needed
    console.log('Expand section:', section);
  }

  formatSlotDisplay(slot: { slot_date: string; slot_time: string }): string {
    const d = slot.slot_date;
    if (!d || !slot.slot_time) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m, day] = d.split('-');
    const month = months[parseInt(m || '1', 10) - 1] || m;
    return `${month} ${parseInt(day || '0', 10)} ${slot.slot_time}`;
  }

  getNavTargetLabel(target: string): string {
    const t = (target || '').toLowerCase();
    if (t === 'insurance') return 'the Insurance page';
    if (t === 'doctors' || t === 'doctor_list') return 'the Doctors page';
    if (t === 'chat') return 'Chat';
    return target || 'that page';
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'consult_doctor': '⚠️ Consult Doctor',
      'emergency': '🚨 Emergency',
      'monitor': '👁️ Monitor',
      'self_care': '💚 Self Care',
      'within_week': '📅 Within Week',
      'within_days': '⏰ Within Days',
      'urgent': '⚡ Urgent'
    };
    return labels[severity] || severity;
  }
}

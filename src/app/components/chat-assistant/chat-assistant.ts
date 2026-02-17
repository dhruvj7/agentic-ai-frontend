import { 
  Component, 
  inject, 
  signal, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked 
} from '@angular/core';
import { Router } from '@angular/router';
import { ChatApiService, ChatResponse, Doctor as ApiDoctor } from '../../services/chat-api.service';
import { ChatMessage, MessageContent } from '../../models/chat-message.model';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { Doctor } from '../../models/doctor.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-chat-assistant',
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
})
export class ChatAssistant implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(private cdr:ChangeDetectorRef) { }

  startNavigation(msg: any) {
  const steps = msg.content.navigation.route.steps;

  // Reset this message only
  msg.content.currentStepIndex = 0;

  // Clear existing interval if restarting
  if (msg.content.navigationInterval) {
    clearInterval(msg.content.navigationInterval);
  }

  msg.content.navigationInterval = setInterval(() => {
    if (msg.content.currentStepIndex < steps.length - 1) {
      msg.content.currentStepIndex++;
      this.cdr.detectChanges();
    } else {
      clearInterval(msg.content.navigationInterval);
    }
  }, 2000);
}

  private chatApi = inject(ChatApiService);
  private doctorMatch = inject(DoctorMatchService);
  private router = inject(Router);

  readonly messages = signal<ChatMessage[]>([]);
  readonly inputValue = signal('');
  readonly isTyping = signal(false);
  readonly assistantName = 'AI Care Navigator';
  readonly sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  private scrollToBottom = false;
  private userAge = 35; // Could come from user profile
  private userLocation = 'hospital_lobby'; // Could be dynamic

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

    // Store matched doctors if available
    if (content.careOptions?.matched_doctors) {
      this.doctorMatch.setMatchedDoctors(content.careOptions.matched_doctors);
    }

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

    // Handle multi-intent responses
    if (Array.isArray(intent) && result.sub_results) {
      return {
        type: 'multi_intent',
        text: result.message,
        subResults: result.sub_results.map(sr => {
          const transformedCareOptions = sr.care_options?.matched_doctors
            ? {
                ...sr.care_options,
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
            nextSteps: sr.next_steps
          };
        })
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
      
      return {
        type: 'symptom_analysis',
        text: result.message,
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

    // Doctor suggestion / list doctors – use clean card UI instead of raw markdown message
    const isDoctorSuggestionIntent =
      intent === 'doctor_suggestion' ||
      result.intent === 'doctor_suggestion' ||
      (Array.isArray(intent) && intent.includes('doctor_suggestion'));
    const doctorsFromResult = result['doctors'] ?? result.care_options?.matched_doctors;
    const hasDoctors = Array.isArray(doctorsFromResult) && doctorsFromResult.length > 0;

    if ((isDoctorSuggestionIntent || (hasDoctors && !result.analysis && !result.sub_results))) {
      const rawDoctors = doctorsFromResult ?? [];
      const matchedDoctors = this.transformDoctors(rawDoctors);
      const specialty = result['specialty'] as string | undefined;
      const cleanIntro = specialty
        ? `Here are ${matchedDoctors.length} ${specialty} doctor${matchedDoctors.length === 1 ? '' : 's'} we found.`
        : `Here are the ${matchedDoctors.length} doctor${matchedDoctors.length === 1 ? '' : 's'} you asked for.`;
      return {
        type: 'doctor_list',
        text: cleanIntro,
        careOptions: {
          matched_doctors: matchedDoctors as any,
          suggested_specialties: specialty ? [specialty] : []
        }
      };
    }

    // Legacy: list_doctors / doctor_list with care_options
    const listDoctorsIntent =
      intent === 'list_doctors' ||
      intent === 'doctor_list' ||
      result.intent === 'list_doctors' ||
      result.intent === 'doctor_list';
    const hasMatchedDoctors = result.care_options?.matched_doctors?.length;
    if (listDoctorsIntent && hasMatchedDoctors && result.care_options) {
      const transformedDoctors = this.transformDoctors(result.care_options.matched_doctors);
      return {
        type: 'doctor_list',
        text: result.message,
        careOptions: {
          matched_doctors: transformedDoctors as any,
          suggested_specialties: result.care_options.suggested_specialties || []
        }
      };
    }

    // Default text response
    return {
      type: 'text',
      text: result.message
    };
  }

  viewMatchedDoctors(): void {
    this.router.navigate(['/doctors']);
  }

  selectDoctor(doctor: Doctor | ApiDoctor): void {
    this.doctorMatch.setMatchedDoctors([doctor]);
    this.router.navigate(['/doctors']);
  }

  expandSection(section: string): void {
    // Toggle section expansion if needed
    console.log('Expand section:', section);
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
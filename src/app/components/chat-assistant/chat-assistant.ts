import { 
  Component, 
  inject, 
  signal, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked 
} from '@angular/core';
import { Router } from '@angular/router';
import { ChatApiService, ChatResponse, Doctor } from '../../services/chat-api.service';
import { ChatMessage, MessageContent } from '../../models/chat-message.model';
import { DoctorMatchService } from '../../services/doctor-match.service';

@Component({
  selector: 'app-chat-assistant',
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
})
export class ChatAssistant implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

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

  private parseResponseContent(response: ChatResponse): MessageContent {
    const { result, intent } = response;

    // Handle multi-intent responses
    if (Array.isArray(intent) && result.sub_results) {
      return {
        type: 'multi_intent',
        text: result.message,
        subResults: result.sub_results.map(sr => ({
          intent: sr.intent,
          message: sr.message,
          analysis: sr.analysis,
          recommendations: sr.recommendations,
          careOptions: sr.care_options,
          bookingFlow: sr.booking_flow,
          instructions: sr.instructions,
          nextSteps: sr.next_steps
        }))
      };
    }

    // Handle single intent responses    
    if (intent === 'symptom_analysis' || result.intent === 'symptom_analysis') {
      return {
        type: 'symptom_analysis',
        text: result.message,
        analysis: result.analysis,
        recommendations: result.recommendations,
        careOptions: result.care_options,
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

    // Default text response
    return {
      type: 'text',
      text: result.message
    };
  }

  viewMatchedDoctors(): void {
    this.router.navigate(['/doctors']);
  }

  selectDoctor(doctor: Doctor): void {
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
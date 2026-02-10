import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { Doctor } from '../../models/doctor.model';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { MOCK_DOCTORS } from '../../data/mock-doctors';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  matchedDoctors?: Doctor[];
}

@Component({
  selector: 'app-chat-assistant',
  imports: [],
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
})
export class ChatAssistant implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private doctorMatch = inject(DoctorMatchService);
  private router = inject(Router);

  readonly messages = signal<ChatMessage[]>([]);
  readonly inputValue = signal('');
  readonly isTyping = signal(false);
  readonly assistantName = 'AI Care Navigator';

  private scrollToBottom = false;

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

    this.messages.update(m => [...m, { role: 'user', content: text }]);
    this.inputValue.set('');
    this.scrollToBottom = true;
    this.isTyping.set(true);

    const lower = text.toLowerCase();
    const isSymptomLike = ['fever', 'pain', 'headache', 'cough', 'cold', 'symptom', 'feel', 'having', 'hurt', 'ache'].some(w => lower.includes(w));

    setTimeout(() => {
      this.isTyping.set(false);
      if (isSymptomLike) {
        const doctors = MOCK_DOCTORS.slice(0, 3);
        this.doctorMatch.setMatchedDoctors(doctors);
        this.messages.update(m => [
          ...m,
          {
            role: 'assistant',
            content: `Based on what you've shared ("${text}"), we recommend a consultation. Here are some doctors that may be a good fit—you can view their profiles and book an appointment.`,
            matchedDoctors: doctors,
          },
        ]);
      } else {
        this.messages.update(m => [
          ...m,
          {
            role: 'assistant',
            content: `Thanks for your message. I'm here to help with symptoms, appointments, insurance, or in-hospital guidance. You can describe how you're feeling or ask a question, and I'll guide you to the next steps.`,
          },
        ]);
      }
      this.scrollToBottom = true;
    }, 700);
  }

  viewMatchedDoctors(): void {
    this.router.navigate(['/doctors']);
  }
}

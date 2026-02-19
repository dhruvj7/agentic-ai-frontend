import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatApiService, ChatResponse } from '../../services/chat-api.service';
import { ChatStateService } from '../../services/chat-state.service';
import { AutomationService } from '../../services/automation.service';
import { ChatMessage } from '../../models/chat-message.model';
import { MessageContent } from '../../models/chat-message.model';

@Component({
  selector: 'app-insurance',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './insurance.html',
  styleUrl: './insurance.scss',
})
export class Insurance {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private chatApi = inject(ChatApiService);
  private chatState = inject(ChatStateService);
  readonly automation = inject(AutomationService);

  readonly form: FormGroup;
  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly verificationSuccess = signal(false);
  readonly error = signal<string | null>(null);
  readonly nextSteps = signal<string[]>([]);

  constructor() {
    this.form = this.fb.group({
      provider_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      policy_number: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
      group_number: ['', [Validators.maxLength(20)]],
      policy_holder_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      date_of_birth: ['', [Validators.required]],
      relationship_to_patient: ['self', [Validators.required]],
      effective_date: [''],
    });
  }

  hasError(controlName: string, errorType: string): boolean {
    const c = this.form.get(controlName);
    return c ? c.hasError(errorType) && (c.dirty || c.touched) : false;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.error.set(null);
    if (!this.form.valid) return;

    this.isSubmitting.set(true);
    const values = this.form.getRawValue();
    const sessionId =
      this.chatState.getSessionId() ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userMessage: ChatMessage = {
      role: 'user',
      content: { type: 'text', text: 'validate insurance' },
      timestamp: new Date(),
    };

    const context: Record<string, string> = {
      provider_name: values.provider_name,
      policy_number: values.policy_number,
      policy_holder_name: values.policy_holder_name,
      date_of_birth: values.date_of_birth,
      relationship_to_patient: values.relationship_to_patient,
    };
    if (values.group_number?.trim()) context['group_number'] = values.group_number.trim();
    if (values.effective_date?.trim()) context['effective_date'] = values.effective_date.trim();

    this.chatApi
      .sendMessage({
        context,
        message: 'validate insurance',
        session_id: sessionId,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          const result = response.result;
          const verificationResult = result?.['verification_result'];
          const isSuccess = verificationResult?.is_verified === true;

          const content = this.parseResponseContent(response);
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content,
            timestamp: new Date(),
            intent: response.intent,
          };
          const existing = this.chatState.getMessages();
          this.chatState.save([...existing, userMessage, assistantMessage], sessionId);

          if (isSuccess) {
            this.submitted.set(true);
            this.verificationSuccess.set(true);
            this.error.set(null);
            this.nextSteps.set((result?.['next_steps'] as string[]) ?? []);
            // Mark insurance step as completed for multi-step navigation
            setTimeout(() => {
              this.automation.completeCurrentStep();
            }, 1500);
          } else {
            this.form.reset({ relationship_to_patient: 'self' });
            this.error.set(result?.message ?? 'Verification failed.');
            this.nextSteps.set((result?.['next_steps'] as string[]) ?? []);
            // Still mark as completed even if verification failed (user interacted)
            setTimeout(() => {
              this.automation.completeCurrentStep();
            }, 1500);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.form.reset({ relationship_to_patient: 'self' });
          this.error.set(err?.error?.message || 'Failed to validate insurance. Please try again.');
          this.nextSteps.set([]);
        },
      });
  }

  private parseResponseContent(response: ChatResponse): MessageContent {
    const result = response.result;
    const verificationResult = result?.['verification_result'];
    const isSuccess = verificationResult?.is_verified === true;

    if (verificationResult) {
      return {
        type: 'insurance_verification_result',
        text: result?.message ?? (isSuccess ? 'Your insurance has been verified.' : 'We encountered issues verifying your insurance.'),
        insuranceVerificationSuccess: isSuccess,
        verificationResult: verificationResult as any,
        nextSteps: result?.['next_steps'] as string[] | undefined,
        requiresInsuranceValidation: !isSuccess,
        insuranceLink: '/insurance',
      };
    }
    return {
      type: 'text',
      text: result?.message ?? 'Insurance details received. You can continue your conversation in the chat.',
    };
  }

  backToChat(): void {
    this.router.navigate(['/chat']);
  }
}

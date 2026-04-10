import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { ChatApiService, ChatRequest } from '../../services/chat-api.service'; // Ensure correct path
import { Doctor } from '../../models/doctor.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './book-appointment.html',
  styleUrls: ['./book-appointment.scss']
})
export class BookAppointment implements OnInit {
  private readonly CONTACT_PHONE_KEY = 'booking_contact_phone';
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private doctorMatchService = inject(DoctorMatchService);
  private chatApiService = inject(ChatApiService); 
  readonly authService = inject(AuthService);

  isSubmitting = signal(false);
  showSuccess = signal(false);
  appointmentDetails = signal<{doctor: Doctor, slot: any} | null>(null);
  errorMessage = signal<string | null>(null);
  private autoSubmitAttempted = signal(false);

  bookingForm: FormGroup = this.fb.group({
    patientName: ['', [Validators.required, Validators.minLength(2)]],
    mobileNumber: ['', [Validators.pattern('^[0-9]{10}$')]],
    email: ['', [Validators.required, Validators.email]],
    notes: [''] 
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (!user) return;

      this.prefillFormFromUser(user.name, user.email);
      this.updateMobileValidator();
      this.tryAutoSubmit();
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const routeDoctorId = Number(this.route.snapshot.paramMap.get('id'));
      const doctorId = Number(params['doctorId'] || routeDoctorId);
      const slotId = Number(params['slotId']);
      if (doctorId) {
        this.loadData(doctorId, slotId);
      } else {
        this.router.navigate(['/doctors']);
      }
    });
  }

  private loadData(doctorId: number, slotId: number) {
    const doctors = this.doctorMatchService.matchedDoctors();
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      const slot = slotId
        ? doctor.slots?.find(s => s.id === slotId)
        : doctor.slots?.[0];
      if (slot) {
        this.appointmentDetails.set({ doctor, slot });
        this.tryAutoSubmit();
      }
    }
  }

  private prefillFormFromUser(name: string, email: string): void {
    const currentName = this.bookingForm.get('patientName')?.value;
    const currentEmail = this.bookingForm.get('email')?.value;
    const savedPhone = localStorage.getItem(this.CONTACT_PHONE_KEY);

    if (!currentName && name) {
      this.bookingForm.patchValue({ patientName: name });
    }

    if (!currentEmail && email) {
      this.bookingForm.patchValue({ email });
    }

    if (!this.bookingForm.get('mobileNumber')?.value && savedPhone) {
      this.bookingForm.patchValue({ mobileNumber: savedPhone });
    }
  }

  private updateMobileValidator(): void {
    const mobileControl = this.bookingForm.get('mobileNumber');
    if (!mobileControl) return;

    const validators = [Validators.pattern('^[0-9]{10}$')];
    if (!this.authService.isAuthenticated()) {
      validators.unshift(Validators.required);
    }

    mobileControl.setValidators(validators);
    mobileControl.updateValueAndValidity({ emitEvent: false });
  }

  private tryAutoSubmit(): void {
    if (this.autoSubmitAttempted()) return;
    if (!this.authService.isAuthenticated()) return;
    if (!this.appointmentDetails()) return;
    if (this.bookingForm.invalid) return;

    this.autoSubmitAttempted.set(true);
    setTimeout(() => this.onSubmit(), 250);
  }

  onSubmit() {
    // Clear any previous error messages
    this.errorMessage.set(null);
    
    if (this.bookingForm.invalid || !this.appointmentDetails()) {
      this.bookingForm.markAllAsTouched();
      
      // Show specific error message if mobile number is invalid
      if (this.bookingForm.get('mobileNumber')?.invalid) {
        if (this.bookingForm.get('mobileNumber')?.errors?.['required']) {
          this.errorMessage.set('Please enter your mobile number');
        } else if (this.bookingForm.get('mobileNumber')?.errors?.['pattern']) {
          this.errorMessage.set('Please enter a valid 10-digit mobile number');
        }
      } else if (this.bookingForm.get('patientName')?.invalid) {
        this.errorMessage.set('Please enter your full name');
      } else if (this.bookingForm.get('email')?.invalid) {
        this.errorMessage.set('Please enter a valid email address');
      }
      
      return;
    }

    this.isSubmitting.set(true);
    const details = this.appointmentDetails()!;
    const phone = this.bookingForm.value.mobileNumber || 'Not provided';

    if (this.bookingForm.value.mobileNumber) {
      localStorage.setItem(this.CONTACT_PHONE_KEY, this.bookingForm.value.mobileNumber);
    }

    // Construct the Agentic Message
    const agentMessage = `BOOK_APPOINTMENT: Please book an appointment for ${details.doctor.name} (ID: ${details.doctor.id}). 
    Slot Details: ID ${details.slot.id}, Date ${details.slot.slot_date}, Time ${details.slot.slot_time}.
    Patient Details:
    - Name: ${this.bookingForm.value.patientName}
    - Phone: ${phone}
    - Email: ${this.bookingForm.value.email}
    - Notes: ${this.bookingForm.value.notes || 'None'}`;

  
    const request: ChatRequest = {
      message: agentMessage,
      session_id: localStorage.getItem('chat_session_id') || `session_${Date.now()}`,
      context: {
        location: 'Booking Page'
      }
    };

    this.chatApiService.sendMessage(request).subscribe({
      next: (response) => {
        console.log('Agent Response:', response);
        this.isSubmitting.set(false);
        this.showSuccess.set(true);
        

        setTimeout(() => this.router.navigate(['/chat']), 3000);
      },
      error: (err) => {
        console.error('Booking failed:', err);
        this.isSubmitting.set(false);
        
        // Extract error message from API response if available
        let errorMsg = 'There was an error booking your appointment. Please try again.';
        if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.error?.detail) {
          errorMsg = err.error.detail;
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        this.errorMessage.set(errorMsg);
        
        // Scroll to error message
        setTimeout(() => {
          const errorElement = document.querySelector('.form-error-message');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    });
  }

  getInitials(name: string): string {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'DR';
  }

  // Helper method to clear error message when user starts typing
  onFieldChange() {
    if (this.errorMessage()) {
      this.errorMessage.set(null);
    }
  }
}

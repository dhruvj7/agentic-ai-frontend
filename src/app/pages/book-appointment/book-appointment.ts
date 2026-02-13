import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { ChatApiService, ChatRequest } from '../../services/chat-api.service'; // Ensure correct path
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './book-appointment.html',
  styleUrls: ['./book-appointment.scss']
})
export class BookAppointment implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private doctorMatchService = inject(DoctorMatchService);
  private chatApiService = inject(ChatApiService); 

  isSubmitting = signal(false);
  showSuccess = signal(false);
  appointmentDetails = signal<{doctor: Doctor, slot: any} | null>(null);

  bookingForm: FormGroup = this.fb.group({
    patientName: ['', [Validators.required, Validators.minLength(2)]],
    mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    email: ['', [Validators.required, Validators.email]],
    notes: [''] 
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const doctorId = Number(params['doctorId']);
      const slotId = Number(params['slotId']);
      if (doctorId && slotId) {
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
      const slot = doctor.slots?.find(s => s.id === slotId);
      if (slot) {
        this.appointmentDetails.set({ doctor, slot });
      }
    }
  }

  onSubmit() {
    if (this.bookingForm.invalid || !this.appointmentDetails()) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const details = this.appointmentDetails()!;

    // Construct the Agentic Message
    const agentMessage = `BOOK_APPOINTMENT: Please book an appointment for ${details.doctor.name} (ID: ${details.doctor.id}). 
    Slot Details: ID ${details.slot.id}, Date ${details.slot.slot_date}, Time ${details.slot.slot_time}.
    Patient Details:
    - Name: ${this.bookingForm.value.patientName}
    - Mobile: ${this.bookingForm.value.mobileNumber}
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
        

        setTimeout(() => this.router.navigate(['/']), 3000);
      },
      error: (err) => {
        console.error('Booking failed:', err);
        this.isSubmitting.set(false);
        alert('There was an error booking your appointment. Please try again.');
      }
    });
  }

  getInitials(name: string): string {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'DR';
  }
}
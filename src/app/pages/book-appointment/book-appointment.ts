import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MOCK_DOCTORS } from '../../data/mock-doctors';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-book-appointment',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './book-appointment.html',
  styleUrl: './book-appointment.scss',
})
export class BookAppointment {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  readonly doctorId = signal<string | null>(null);
  readonly doctor = computed<Doctor | null>(() => {
    const id = this.doctorId();
    return id ? MOCK_DOCTORS.find(d => d.id === id) ?? null : null;
  });
  /** Only slots available for the selected doctor. */
  readonly availableSlots = computed(() => {
    const d = this.doctor();
    return d?.availableSlots?.length ? d.availableSlots : [];
  });
  readonly submitted = signal(false);

  form: FormGroup;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.doctorId.set(id);
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      slot: ['', [Validators.required]],
      reason: ['', [Validators.maxLength(500)]],
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.submitted.set(true);
    }
  }

  hasError(controlName: string, errorType: string): boolean {
    const c = this.form.get(controlName);
    return c ? c.hasError(errorType) && (c.dirty || c.touched) : false;
  }
}

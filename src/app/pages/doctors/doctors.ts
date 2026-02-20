import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { AutomationService } from '../../services/automation.service';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './doctors.html',
  styleUrl: './doctors.scss',
})
export class Doctors implements OnInit {
  private doctorMatch = inject(DoctorMatchService);
  private router = inject(Router);
  readonly automation = inject(AutomationService);

  // Doctors signal
  readonly doctors = computed(() => {
    return this.doctorMatch.matchedDoctors();
  });

  // Selected slot state
  selectedDoctorId = signal<number | null>(null);
  selectedSlotId = signal<number | null>(null);

  /** Show slot confirmation modal when automation pre-selected a slot */
  showSlotConfirmModal = signal(false);

  ngOnInit(): void {
    const pending = this.automation.pendingSlotConfirmation();
    // Only show confirmation modal if auto-navigate is OFF
    if (pending?.doctor && pending?.slot && !this.automation.automationEnabled()) {
      this.selectedDoctorId.set(pending.doctor.id);
      this.selectedSlotId.set(pending.slot.id);
      this.showSlotConfirmModal.set(true);
    }

    // Mark doctors step as completed if part of multi-step navigation
    // Give user a moment to see the page, then mark complete
    setTimeout(() => {
      this.automation.completeCurrentStep();
    }, 2000);
  }

  selectSlot(doctorId: number, slotId: number) {
    this.selectedDoctorId.set(doctorId);
    this.selectedSlotId.set(slotId);

    console.log('Selected Doctor:', doctorId);
    console.log('Selected Slot:', slotId);
  }
groupSlotsByDate(slots: any[]) {
  const grouped: Record<string, any[]> = {};

  for (const slot of slots) {
    if (!grouped[slot.slot_date]) {
      grouped[slot.slot_date] = [];
    }
    grouped[slot.slot_date].push(slot);
  }

  return Object.keys(grouped).map(date => ({
    date,
    slots: grouped[date]
  }));
}

 bookAppointment(doctorId: number) {
  const slotId = this.selectedSlotId();
  
  if (!slotId || this.selectedDoctorId() !== doctorId) {
    alert('Please select an available time slot first.');
    return;
  }

  // Navigate to /book-appointment/16?slotId=121
  this.router.navigate(['/book-appointment', doctorId], {
    queryParams: { 
      slotId: slotId,
      doctorId: doctorId // Passing both ensures your booking page has easy access
    }
  });
}
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  confirmAutoSlot(): void {
    this.automation.confirmSlotAndNavigateToBooking();
    this.showSlotConfirmModal.set(false);
  }

  cancelAutoSlot(): void {
    this.automation.cancelSlotConfirmation();
    this.showSlotConfirmModal.set(false);
  }

  formatSlotLabel(slot: { slot_date: string; slot_time: string }): string {
    if (!slot?.slot_date || !slot?.slot_time) return '';
    const [y, m, d] = slot.slot_date.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m || '1', 10) - 1] || m} ${d}, ${slot.slot_time}`;
  }
}

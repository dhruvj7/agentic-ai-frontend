import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DoctorMatchService } from '../../services/doctor-match.service';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './doctors.html',
  styleUrl: './doctors.scss',
})
export class Doctors {
  private doctorMatch = inject(DoctorMatchService);
  private router = inject(Router);

  // Doctors signal
  readonly doctors = computed(() => {
    return this.doctorMatch.matchedDoctors();
  });

  // Selected slot state
  selectedDoctorId = signal<number | null>(null);
  selectedSlotId = signal<number | null>(null);

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
}

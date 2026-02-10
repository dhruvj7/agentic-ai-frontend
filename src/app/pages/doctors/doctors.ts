import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DoctorMatchService } from '../../services/doctor-match.service';
import { MOCK_DOCTORS } from '../../data/mock-doctors';

@Component({
  selector: 'app-doctors',
  imports: [RouterLink],
  templateUrl: './doctors.html',
  styleUrl: './doctors.scss',
})
export class Doctors {
  private doctorMatch = inject(DoctorMatchService);
  readonly doctors = computed(() => {
    const m = this.doctorMatch.matchedDoctors();
    return m.length ? m : MOCK_DOCTORS;
  });

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}

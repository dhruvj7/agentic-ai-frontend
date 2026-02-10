import { Injectable, signal } from '@angular/core';
import { Doctor } from '../models/doctor.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorMatchService {
  readonly matchedDoctors = signal<Doctor[]>([]);

  setMatchedDoctors(doctors: Doctor[]): void {
    this.matchedDoctors.set(doctors);
  }

  clear(): void {
    this.matchedDoctors.set([]);
  }
}

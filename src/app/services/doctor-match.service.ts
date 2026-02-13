import { Injectable, signal } from '@angular/core';
import { Doctor } from '../models/doctor.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorMatchService {

  private STORAGE_KEY = 'matched_doctors';

  readonly matchedDoctors = signal<Doctor[]>(
    this.loadFromStorage()
  );

  setMatchedDoctors(doctors: Doctor[]) {
    this.matchedDoctors.set([...doctors]);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(doctors));
  }

  clear(): void {
    this.matchedDoctors.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private loadFromStorage(): Doctor[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}


import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { AutomationService } from './services/automation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly automation = inject(AutomationService);

  getStepLabel(intent: string): string {
    const labels: Record<string, string> = {
      'doctor_suggestion': 'View Doctors',
      'symptom_analysis': 'Symptom Analysis',
      'hospital_navigation': 'Hospital Navigation',
      'insurance_verification': 'Insurance Verification',
      'insurance_validation': 'Insurance Validation',
      'appointment_booking': 'Book Appointment',
    };
    return labels[intent] || intent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatSlotLabel(slot: { slot_date: string; slot_time: string }): string {
    if (!slot?.slot_date || !slot?.slot_time) return '';
    const [y, m, d] = slot.slot_date.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m || '1', 10) - 1] || m} ${d}, ${slot.slot_time}`;
  }
}

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
    };
    return labels[intent] || intent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

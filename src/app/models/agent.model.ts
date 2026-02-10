export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  longDescription?: string;
}

export const AGENTS: Agent[] = [
  { id: 'symptom', name: 'Symptom Agent', description: 'Analyze symptoms and get health insights', icon: '🩺', longDescription: 'Describe your symptoms and receive intelligent follow-up questions and preliminary guidance.' },
  { id: 'insurance', name: 'Insurance Agent', description: 'Coverage and claims support', icon: '🛡️', longDescription: 'Check coverage, understand claims, and get help with insurance-related queries.' },
  { id: 'appointment', name: 'Appointment Scheduler', description: 'Book and manage appointments', icon: '📅', longDescription: 'Find available slots and book appointments with your chosen doctor seamlessly.' },
  { id: 'guidance', name: 'In-Hospital Guidance', description: 'Navigate and get help in the facility', icon: '🏥', longDescription: 'Wayfinding, department info, and in-hospital support at your fingertips.' },
];

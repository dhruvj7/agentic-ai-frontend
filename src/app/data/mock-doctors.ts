import { Doctor } from '../models/doctor.model';

/** Human-readable slot labels shown to users. Each doctor has their own available slots. */
const slots1 = [
  'Feb 12, 9:00 AM',
  'Feb 12, 2:00 PM',
  'Feb 13, 10:00 AM',
  'Feb 13, 3:00 PM',
  'Feb 14, 9:00 AM',
  'Feb 14, 11:00 AM',
];
const slots2 = [
  'Feb 12, 10:00 AM',
  'Feb 12, 4:00 PM',
  'Feb 13, 9:00 AM',
  'Feb 13, 2:00 PM',
  'Feb 15, 10:00 AM',
];
const slots3 = [
  'Feb 12, 11:00 AM',
  'Feb 13, 11:00 AM',
  'Feb 14, 2:00 PM',
  'Feb 14, 4:00 PM',
  'Feb 15, 9:00 AM',
  'Feb 15, 3:00 PM',
];
const slots4 = [
  'Feb 12, 3:00 PM',
  'Feb 13, 4:00 PM',
  'Feb 14, 10:00 AM',
  'Feb 15, 2:00 PM',
];

export const MOCK_DOCTORS: Doctor[] = [
  { id: 1, name: 'Dr. Priya Sharma', specialty: 'General Physician', qualification: 'MBBS, MD', experience: '12 years', rating: 4.9, availableSlots: slots1 },
  { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'Internal Medicine', qualification: 'MBBS, MD (Internal Medicine)', experience: '15 years', rating: 4.8, availableSlots: slots2 },
  { id: 3, name: 'Dr. Anjali Mehta', specialty: 'Family Medicine', qualification: 'MBBS, DNB', experience: '8 years', rating: 4.7, availableSlots: slots3 },
  { id: 4, name: 'Dr. Vikram Singh', specialty: 'General Physician', qualification: 'MBBS, MD', experience: '10 years', rating: 4.9, availableSlots: slots4 },
];

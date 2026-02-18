export interface DoctorSlot {
  id: number;
  doctor_id?: number;
  slot_date: string;
  slot_time: string;
  duration_minutes?: number;
  location?: string;
}

export interface Doctor {
  id: number;
  name: string;
  email?: string;
  specialty?: string;
  department?: string;
  qualification?: string;
  experience?: string;
  rating?: number;
  imageUrl?: string;
  /** Normalized slots used across chat + doctors page */
  slots?: DoctorSlot[];
  /** Legacy human-readable slot labels (landing/demo data) */
  availableSlots?: string[];
}

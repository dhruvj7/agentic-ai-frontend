export interface DoctorSlot {
  id: number;
  doctor_id: number;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  location?: string;
}
export interface Doctor {
  id: string | number;
  name: string;
  email: string;
  specialty: string;
  department: string;
  qualification?: string;
  experience?: string;
  rating?: number;
  imageUrl?: string;
  slots?:Slot[]
  availableSlots?: string[];
  slots?: DoctorSlot[];
}

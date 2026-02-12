export interface Doctor {
  id: string;
  name: string;
  email?: string;
  specialty?: string;
  department?: string;
  qualification?: string;
  experience?: string;
  rating?: number;
  imageUrl?: string;
  availableSlots?: string[];
}
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  experience: string;
  rating: number;
  imageUrl?: string;
  availableSlots?: string[];
}

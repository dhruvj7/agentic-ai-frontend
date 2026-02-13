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
  slots?:Slot[]
  availableSlots?: string[];
}
interface Slot{
  id:number
  slot_time:string,
  slot_date:string
}
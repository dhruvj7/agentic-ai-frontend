import { Doctor, SymptomAnalysis, Recommendations, CareOptions, BookingFlow } from '../services/chat-api.service';

export type MessageContentType = 
  | 'text' 
  | 'symptom_analysis' 
  | 'appointment_booking' 
  | 'hospital_navigation'
  | 'multi_intent'
  | 'doctor_list';

export interface MessageContent {
  type: MessageContentType;
  text?: string;
  
  // Symptom analysis data
  analysis?: SymptomAnalysis;
  recommendations?: Recommendations;
  careOptions?: CareOptions;
  nextSteps?: string[];
  
  // Appointment booking data
  bookingFlow?: BookingFlow;
  instructions?: string[];

  navigation?: any;
  currentStepIndex?: number;
  
  // Multi-intent
  subResults?: Array<{
    intent: string;
    message: string;
    analysis?: SymptomAnalysis;
    recommendations?: Recommendations;
    careOptions?: CareOptions;
    bookingFlow?: BookingFlow;
    instructions?: string[];
    nextSteps?: string[];
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: MessageContent;
  timestamp: Date;
  intent?: string | string[];
}
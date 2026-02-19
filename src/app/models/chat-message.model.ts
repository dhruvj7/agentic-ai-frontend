import { Doctor, SymptomAnalysis, Recommendations, CareOptions, BookingFlow } from '../services/chat-api.service';

export type MessageContentType =
  | 'text'
  | 'symptom_analysis'
  | 'appointment_booking'
  | 'hospital_navigation'
  | 'multi_intent'
  | 'insurance_validation'
  | 'insurance_verification_result'
  | 'doctor_list';

export interface InsuranceVerificationResult {
  verification_status: string;
  is_verified: boolean;
  policy_found?: boolean;
  verification_details?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  message?: string;
}

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

  /** When API indicates insurance validation is needed or provides an insurance link */
  requiresInsuranceValidation?: boolean;
  insuranceLink?: string;

  /** Insurance verification result (success or failure after validation attempt) */
  insuranceVerificationSuccess?: boolean;
  verificationResult?: InsuranceVerificationResult;

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
    requiresInsuranceValidation?: boolean;
    insuranceLink?: string;
    navigation?: any; // Hospital navigation data
    currentStepIndex?: number; // For navigation step tracking
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: MessageContent;
  timestamp: Date;
  intent?: string | string[];
}

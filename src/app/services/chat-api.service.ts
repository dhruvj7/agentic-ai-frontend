import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  context: {
    location?: string;
    user_age?: number;
    current_location?: {
      building: string;
      floor: string;
      room: string;
      name: string;
      coordinates: { x: number; y: number };
    };
  };
  message: string;
  session_id: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  department: string;
  qualification?: string;
  experience?: string;
  rating?: number;
  imageUrl?: string;
  availableSlots?: string[];
}

export interface SymptomAnalysis {
  severity: string;
  is_emergency: boolean;
  requires_doctor: boolean;
  urgency_level: string;
  confidence_score: number;
  primary_analysis: string;
  differential_diagnosis: string[];
  reasoning: string;
  red_flags: string[];
}

export interface Recommendations {
  immediate_actions: string[];
  home_care_advice: string[];
  when_to_seek_help: string[];
  preparation_for_doctor: string[];
}

export interface CareOptions {
  suggested_specialties: string[];
  matched_doctors: Doctor[];
}

export interface BookingFlow {
  step: string;
  collected: {
    specialty: string | null;
    preferred_date: string | null;
    doctor_name: string | null;
    reason: string;
  };
  next_questions: string[];
}

export interface SubResult {
  status: string;
  message: string;
  analysis?: SymptomAnalysis;
  recommendations?: Recommendations;
  care_options?: CareOptions;
  next_steps?: string[];
  booking_flow?: BookingFlow;
  available_endpoints?: Record<string, string>;
  instructions?: string[];
  intent: string;
}

export interface ChatResponse {
  session_id: string;
  timestamp: string;
  user_input: string;
  intent: string | string[];
  confidence: number;
  reasoning: string;
  requires_more_info: boolean;
  follow_up_questions: string[];
  result: {
    status: string;
    message: string;
    sub_results?: SubResult[];
    [key: string]: any;

    analysis?: SymptomAnalysis;
    recommendations?: Recommendations;
    care_options?: CareOptions;
    next_steps?: string[];
    booking_flow?: BookingFlow;
    available_endpoints?: Record<string, string>;
    instructions?: string[];
    intent?: string;
    navigation?: any
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/v1/public/chat';

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}
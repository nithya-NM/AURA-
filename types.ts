import React from 'react';

export enum AppState {
  BOOKING = 'BOOKING',
  CONFIRMING = 'CONFIRMING',
  WAITING = 'WAITING',
  IN_RIDE = 'IN_RIDE',
  FINISHED = 'FINISHED',
}

export enum UserRole {
  PASSENGER = 'Passenger',
  DRIVER = 'Driver',
  CAREGIVER = 'Caregiver',
}

export enum RideCurrentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  EMERGENCY = 'EMERGENCY',
  ROUTE_SUGGESTION = 'ROUTE_SUGGESTION',
  FINISHED = 'FINISHED',
}

// FIX: Changed Language enum to use short codes for consistency across the app.
// This fixes a type error in App.tsx where a map was expecting short codes,
// and a logic bug in useSpeechSynthesis.ts. The UI will be updated to display full names.
export enum Language {
  EN = 'en',
  FR = 'fr',
  TA = 'ta',
}

export interface RideOption {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AccessibilityPreferences {
  language: Language;
  largeFont: boolean;
  voiceOutput: boolean;
  voiceSpeed: number;
  hapticFeedback: boolean;
  signLanguage: boolean;
}

export interface CaregiverNotifications {
  rideStartEnd: boolean;
  etaUpdates: boolean;
  emergencyAlerts: boolean;
}

export interface PassengerProfile {
  name: string;
  assistanceNeeds: string[];
  preferences: AccessibilityPreferences;
  caregiverContact?: string;
  caregiverNotifications: CaregiverNotifications;
}

export interface RideStatus {
  pickup: string;
  destination: string;
  totalTripMinutes: number;
  etaMinutes: number;
  driver: {
    name: string;
    vehicle: string;
  };
  routeDescription: string;
  status: RideCurrentStatus;
}

export interface NewRouteSuggestion {
  name: string;
  etaMinutes: number;
  description: string;
}

export interface AuraResponse {
  intent: 'INFO' | 'ASSIST' | 'EMERGENCY' | 'ROUTE_SUGGESTION' | 'DESCRIBE_SURROUNDINGS';
  response_text: string;
  driver_instruction: string | null;
  caregiver_alert: string | null;
  new_route_details?: NewRouteSuggestion;
}

export interface Message {
  id: string;
  sender: 'user' | 'aura';
  text: string;
  timestamp: Date;
  auraData?: AuraResponse;
}

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'processing' | 'error';
export type AuraStatus = 'PASSIVE' | 'LISTENING' | 'PROCESSING' | 'ERROR';
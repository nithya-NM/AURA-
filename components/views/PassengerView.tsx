import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaExclamationTriangle, FaEye, FaCamera, FaPhoneAlt, FaUserShield, FaTimes } from 'react-icons/fa';
import { PassengerProfile, RideStatus, Message, NewRouteSuggestion, RideCurrentStatus, AuraStatus } from '../../types';
import StatusCard from '../StatusCard';
import LiveMap from '../LiveMap';
import AccessibilityPanel from '../AccessibilityPanel';
import SignLanguagePlayer from '../SignLanguagePlayer';
import Card from '../ui/Card';
import { l } from '../../services/localization';
import { QUICK_ACTIONS } from '../../constants';
import ProgressBar from '../ui/ProgressBar';
import CameraFeed, { CameraFeedHandle } from '../CameraFeed';
import AuraStatusIndicator from '../AuraStatusIndicator';

const EmergencyModal: React.FC<{ isOpen: boolean; onClose: () => void; caregiverContact?: string; }> = ({ isOpen, onClose, caregiverContact }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(var(--color-accent-red),0.8)] backdrop-blur-sm flex flex-col justify-center items-center z-50 p-4 text-white text-center" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title">
      <div className="absolute inset-0 bg-black/20 animate-pulse"></div>
      <FaExclamationTriangle className="text-7xl text-white drop-shadow-lg mb-6" />
      <h1 id="emergency-title" className="text-4xl md:text-6xl font-extrabold mb-4 animate-pulse">EMERGENCY ACTIVATED</h1>
      <p className="text-lg md:text-xl mb-8">The driver and your caregiver have been notified.</p>
      
      <div className="w-full max-w-sm space-y-4 z-10">
        {caregiverContact && (
            <a href={`tel:${caregiverContact}`} className="w-full flex items-center justify-center p-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-bold text-white text-xl shadow-lg">
                <FaUserShield className="mr-3 text-2xl" />
                Call Caregiver
            </a>
        )}
        <a href="tel:911" className="w-full flex items-center justify-center p-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 transition-colors font-bold text-black text-xl shadow-lg">
            <FaPhoneAlt className="mr-3 text-2xl" />
            Call Emergency Services
        </a>
      </div>
      
      <button onClick={onClose} className="mt-12 flex items-center justify-center p-3 rounded-lg bg-white/20 hover:bg-white/30 font-semibold z-10" aria-label="Dismiss this message">
          <FaTimes className="mr-2" />
          Dismiss
      </button>
    </div>
  );
};


interface PassengerViewProps {
  passengerProfile: PassengerProfile;
  setPassengerProfile: React.Dispatch<React.SetStateAction<PassengerProfile>>;
  rideStatus: RideStatus;
  handleCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
  messageLog: Message[];
  handleEmergency: () => void;
  newRouteSuggestion: NewRouteSuggestion | null;
  handleRouteDecision: (accept: boolean) => void;
  handleDescribeSurroundings: (base64Image: string) => void;
  isVisionProcessing: boolean;
  visionRequestTrigger: number;
  isSpeaking: boolean;
  auraStatus: AuraStatus;
  transcript: string;
}

const PassengerView: React.FC<PassengerViewProps> = ({ 
    passengerProfile, 
    setPassengerProfile, 
    rideStatus,
    handleCommand,
    isProcessing,
    messageLog,
    handleEmergency,
    newRouteSuggestion,
    handleRouteDecision,
    handleDescribeSurroundings,
    isVisionProcessing,
    visionRequestTrigger,
    isSpeaking,
    auraStatus,
    transcript,
}) => {
  const [isVisionFeatureActive, setIsVisionFeatureActive] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const cameraRef = useRef<CameraFeedHandle>(null);
  const T = l(passengerProfile.preferences.language);

  const lastAuraMessage = messageLog.filter(m => m.sender === 'aura').pop();
  const lastUserMessage = messageLog.filter(m => m.sender === 'user').pop();

  const progress = rideStatus.totalTripMinutes > 0
    ? ((rideStatus.totalTripMinutes - rideStatus.etaMinutes) / rideStatus.totalTripMinutes) * 100
    : (rideStatus.status === RideCurrentStatus.FINISHED ? 100 : 0);

  useEffect(() => {
    if (rideStatus.status === RideCurrentStatus.EMERGENCY) {
      setIsEmergencyModalOpen(true);
      if (passengerProfile.preferences.hapticFeedback) {
        navigator.vibrate?.([200, 100, 200, 100, 200]); // SOS haptic
      }
    }
  }, [rideStatus.status, passengerProfile.preferences.hapticFeedback]);


  const handleCaptureAndDescribe = useCallback(() => {
    if (isVisionProcessing) return;
    const imageData = cameraRef.current?.captureFrame();
    if (imageData) {
        handleDescribeSurroundings(imageData);
    } else {
        console.error("Failed to capture frame from camera.");
    }
  }, [isVisionProcessing, handleDescribeSurroundings]);

  useEffect(() => {
    if (visionRequestTrigger > 0) {
      setIsVisionFeatureActive(true);
      // Wait for camera to initialize before capturing
      const timer = setTimeout(() => {
        handleCaptureAndDescribe();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visionRequestTrigger, handleCaptureAndDescribe]);
  
  const handlePreferencesChange = useCallback(<K extends keyof PassengerProfile['preferences']>(
    key: K, 
    value: PassengerProfile['preferences'][K]
  ) => {
    setPassengerProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  }, [setPassengerProfile]);

  return (
    <>
      <div className="p-2 md:p-4 space-y-4 text-white pb-40">
        <EmergencyModal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          caregiverContact={passengerProfile.caregiverContact}
        />
        <StatusCard rideStatus={rideStatus} lang={passengerProfile.preferences.language} />
        
        <Card className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-200">{T('tripProgress')}</span>
          <ProgressBar progress={progress} />
          <span className="text-sm font-bold w-12 text-right">{Math.round(progress)}%</span>
        </Card>

        <LiveMap />
        
        <Card>
          <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                  <FaEye className="mr-2 text-[rgb(var(--color-accent-aqua))]" />
                  Environmental Vision
              </h3>
              <button
                onClick={() => setIsVisionFeatureActive(prev => !prev)}
                className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors ${isVisionFeatureActive ? 'bg-white/10 hover:bg-white/20' : 'bg-[rgb(var(--color-accent-purple))] hover:bg-[rgba(var(--color-accent-purple),0.8)]'}`}
              >
                {isVisionFeatureActive ? 'Hide Camera' : 'Show Camera'}
              </button>
          </div>
          {isVisionFeatureActive && (
            <div className="mt-4 space-y-4">
              <CameraFeed ref={cameraRef} />
              <button
                  onClick={handleCaptureAndDescribe}
                  disabled={isVisionProcessing}
                  className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500/50 transition-colors font-bold text-white"
              >
                  {isVisionProcessing ? <span className="animate-spin mr-2">◌</span> : <FaCamera className="mr-2" />}
                  {isVisionProcessing ? 'Analyzing...' : 'Describe Surroundings'}
              </button>
            </div>
          )}
        </Card>

        {newRouteSuggestion && rideStatus.status === RideCurrentStatus.ROUTE_SUGGESTION && (
          <Card className="border-2 border-yellow-400">
              <h3 className="text-lg font-bold text-yellow-300 mb-2">{T('newRouteSuggested')}</h3>
              <p><span className="font-semibold">{newRouteSuggestion.name}:</span> {newRouteSuggestion.description}</p>
              <p className="mt-1">New ETA: <span className="font-bold">{newRouteSuggestion.etaMinutes} {T('minutes')}</span></p>
              <div className="flex justify-end space-x-2 mt-4">
                  <button onClick={() => handleRouteDecision(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">{T('decline')}</button>
                  <button onClick={() => handleRouteDecision(true)} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700">{T('accept')}</button>
              </div>
          </Card>
        )}

        <Card className={`${isProcessing ? 'animate-calm-glow' : ''}`}>
          <h3 className="text-lg font-bold mb-2">
            {isProcessing && lastUserMessage ? `You said:` : T('auraResponse')}
          </h3>
          {isProcessing && lastUserMessage && (
            <p className="min-h-[1.5em] text-gray-300 italic mb-2">
              "{lastUserMessage.text}"
            </p>
          )}
          <p className="min-h-[3em] text-gray-200">
            {isProcessing 
              ? <span className="flex items-center text-[rgb(var(--color-accent-aqua))]"><span className="animate-spin mr-2">◌</span> {T('processing')}</span>
              : lastAuraMessage?.text || T('getStartedMessage')
            }
          </p>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS[passengerProfile.preferences.language].map(action => (
                      <button key={action.label} onClick={() => handleCommand(action.query)} className="px-3 py-1.5 text-sm bg-black/20 hover:bg-white/20 border border-white/10 rounded-full transition-colors">
                          {action.label}
                      </button>
                  ))}
              </div>
            </Card>
          </div>

          {passengerProfile.preferences.signLanguage && (
              <div className="lg:col-span-1">
                  <SignLanguagePlayer lastCommand={lastUserMessage?.text || ''} />
              </div>
          )}
        </div>

        <AccessibilityPanel preferences={passengerProfile.preferences} onPreferencesChange={handlePreferencesChange} />
      </div>

      {/* Interaction Bar */}
       <div className="fixed bottom-0 left-0 right-0 p-2 bg-black/30 backdrop-blur-md border-t border-white/10 z-30">
        <div className="max-w-4xl mx-auto flex items-center space-x-2 h-14">
           <div className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-gray-300 italic h-full flex items-center overflow-hidden whitespace-nowrap">
            {transcript || (auraStatus === 'PASSIVE' ? T('sayWakeWordToStart') : '...')}
           </div>
           <AuraStatusIndicator status={auraStatus} isSpeaking={isSpeaking} />
        </div>
      </div>

      <button 
        onClick={handleEmergency} 
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 w-20 h-20 rounded-full bg-[rgb(var(--color-accent-red))] text-white flex flex-col items-center justify-center shadow-2xl animate-pulse-red border-4 border-[rgba(var(--color-accent-red),0.5)]"
        aria-label="Activate Emergency SOS"
      >
          <FaExclamationTriangle size={28} />
          <span className="text-sm font-bold mt-1">SOS</span>
      </button>
    </>
  );
};

export default PassengerView;

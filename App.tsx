import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, PassengerProfile, RideStatus, Message, NewRouteSuggestion, RideCurrentStatus, AppState, RideOption, AuraStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import { INITIAL_PASSENGER_PROFILE, INITIAL_RIDE_STATUS, AURA_COMMANDS } from './constants';
import { getAuraResponse, getVisionDescription } from './services/geminiService';
import { sendSms } from './services/smsService';
import PassengerView from './components/views/PassengerView';
import DriverView from './components/views/DriverView';
import CaregiverView from './components/views/CaregiverView';
import BookingView from './components/views/BookingView';
import ConfirmationView from './components/views/ConfirmationView';
import WaitingView from './components/views/WaitingView';
import { l } from './services/localization';
import { FaUser, FaUserCog, FaUserNurse } from 'react-icons/fa';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.BOOKING);
  const [currentUserRole, setCurrentUserRole] = useLocalStorage<UserRole>('aura_userRole', UserRole.PASSENGER);
  const [passengerProfile, setPassengerProfile] = useLocalStorage<PassengerProfile>('aura_passengerProfile', INITIAL_PASSENGER_PROFILE);
  const [rideStatus, setRideStatus] = useState<RideStatus>(INITIAL_RIDE_STATUS);
  const [messageLog, setMessageLog] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisionProcessing, setIsVisionProcessing] = useState(false);
  const [newRouteSuggestion, setNewRouteSuggestion] = useState<NewRouteSuggestion | null>(null);
  const [visionRequestTrigger, setVisionRequestTrigger] = useState(0);
  const [halfwayNotified, setHalfwayNotified] = useState(false);

  const [bookingDetails, setBookingDetails] = useState<{ rideOption: RideOption | null, pickup: string, destination: string }>({ rideOption: null, pickup: '', destination: '' });

  // Voice Control State
  const [auraStatus, setAuraStatus] = useState<AuraStatus>('PASSIVE');

  const { speak, isSpeaking } = useSpeechSynthesis();
  const T = l(passengerProfile.preferences.language);
  
  const prevAppStateRef = useRef<AppState | undefined>(undefined);
  useEffect(() => {
    prevAppStateRef.current = appState;
  });
  const prevAppState = prevAppStateRef.current;
  
  const { voiceOutput, language, voiceSpeed, hapticFeedback } = passengerProfile.preferences;

  // --- Voice Control Logic ---
  const langCode = passengerProfile.preferences.language;
  const speechRecLanguageMap: { [key in typeof langCode]: string } = { en: 'en-US', fr: 'fr-FR', ta: 'ta-IN' };
  const langForSpeechRec = speechRecLanguageMap[langCode] || 'en-US';
  const { transcript, startListening, stopListening, status: micStatus, resetTranscript } = useSpeechRecognition(langForSpeechRec);

  useEffect(() => {
    if (appState === AppState.IN_RIDE && micStatus === 'idle') {
      startListening();
    } else if (appState !== AppState.IN_RIDE && (micStatus === 'listening' || micStatus === 'processing')) {
      stopListening();
    }
  }, [appState, micStatus, startListening, stopListening]);

  useEffect(() => {
    // FIX: This logic is now for continuous mode. It processes a command when a final transcript is received,
    // and then resets the transcript to prevent reprocessing and prepare for the next command.
    if (!transcript || isProcessing || appState !== AppState.IN_RIDE) {
      return;
    }

    const commandToProcess = transcript;
    resetTranscript(); // Consume the transcript immediately.

    const lowerTranscript = commandToProcess.toLowerCase().trim();
    const { emergencyCommands } = AURA_COMMANDS[langCode];

    // Priority 1: Emergency commands
    if (emergencyCommands.some(cmd => lowerTranscript.includes(cmd))) {
      handleEmergency();
    } else {
      // Any other speech is a command
      handleCommand(lowerTranscript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, appState, isProcessing]);

  useEffect(() => {
    if (isProcessing || isVisionProcessing) {
      setAuraStatus('PROCESSING');
    } else if (micStatus === 'listening') {
      setAuraStatus('LISTENING');
    } else if (micStatus === 'error') {
      setAuraStatus('ERROR');
    } else {
       setAuraStatus('PASSIVE');
    }
  }, [isProcessing, isVisionProcessing, micStatus]);
  

  useEffect(() => {
    if (appState !== AppState.IN_RIDE) return;

    const timer = setInterval(() => {
      setRideStatus(prev => {
        if (prev.status === RideCurrentStatus.IN_PROGRESS && prev.etaMinutes > 0) {
          return { ...prev, etaMinutes: prev.etaMinutes - 1 };
        }
        if (prev.status === RideCurrentStatus.IN_PROGRESS && prev.etaMinutes <= 0) {
          setAppState(AppState.FINISHED);
          return { ...prev, status: RideCurrentStatus.FINISHED, etaMinutes: 0 };
        }
        return prev;
      });
    }, 10000); // Slower progress update

    return () => clearInterval(timer);
  }, [appState]);

  useEffect(() => {
    if (
        appState === AppState.IN_RIDE &&
        !halfwayNotified &&
        rideStatus.etaMinutes <= rideStatus.totalTripMinutes / 2 &&
        rideStatus.etaMinutes > 0
    ) {
        if (passengerProfile.caregiverContact && passengerProfile.caregiverNotifications.etaUpdates) {
            const message = `Aura ETA Update: ${passengerProfile.name} is about halfway to their destination. New ETA: ${rideStatus.etaMinutes} minutes.`;
            sendSms(passengerProfile.caregiverContact, message);
        }
        setHalfwayNotified(true);
    }
  }, [appState, rideStatus, halfwayNotified, passengerProfile]);

  const handleBooking = (rideOption: RideOption, pickup: string, destination: string) => {
    setBookingDetails({ rideOption, pickup, destination });
    setAppState(AppState.CONFIRMING);
  };

  const handleConfirm = () => {
    if (!bookingDetails.rideOption || !bookingDetails.destination || !bookingDetails.pickup) return;
    
    const totalTripMinutes = 30;
    setRideStatus({
      ...INITIAL_RIDE_STATUS,
      pickup: bookingDetails.pickup,
      destination: bookingDetails.destination,
      totalTripMinutes: totalTripMinutes,
      etaMinutes: totalTripMinutes,
      status: RideCurrentStatus.IN_PROGRESS,
    });
    setHalfwayNotified(false);
    setAppState(AppState.WAITING);
  };

  const postAuraSystemMessage = useCallback((text: string, auraData: Partial<Message['auraData']> = {}) => {
    const auraMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'aura',
      text: text,
      timestamp: new Date(),
      auraData: {
        intent: 'INFO',
        response_text: text,
        driver_instruction: auraData.driver_instruction || null,
        caregiver_alert: auraData.caregiver_alert || null,
      },
    };
    setMessageLog(prev => [...prev, auraMessage]);

    if (voiceOutput) {
      speak(text, language, voiceSpeed);
    }
     if (hapticFeedback) {
      navigator.vibrate?.([50, 50, 50]);
    }
  }, [voiceOutput, language, voiceSpeed, hapticFeedback, speak]);
  
  const handleDescribeSurroundings = async (base64Image: string) => {
    if (isVisionProcessing) return;
    setIsVisionProcessing(true);
    
    const description = await getVisionDescription(base64Image, passengerProfile);
    
    postAuraSystemMessage(`Here's what I see: ${description}`);
    
    setIsVisionProcessing(false);
  };

  useEffect(() => {
    if (appState === AppState.IN_RIDE && prevAppState === AppState.WAITING) {
      const welcomeMessage = T('welcomeMessage')
        .replace('{name}', passengerProfile.name)
        .replace('{destination}', rideStatus.destination);
      postAuraSystemMessage(welcomeMessage);
      
      if (passengerProfile.caregiverContact && passengerProfile.caregiverNotifications.rideStartEnd) {
        const trackingLink = window.location.href; // Use current URL as a dummy link.
        const message = `Aura Ride Update: ${passengerProfile.name}'s ride to ${rideStatus.destination} is now in progress. Track live: ${trackingLink}`;
        sendSms(passengerProfile.caregiverContact, message);
      }
    }
  }, [appState, prevAppState, passengerProfile, rideStatus.destination, postAuraSystemMessage, T]);
  
  useEffect(() => {
    if (appState === AppState.FINISHED && prevAppState === AppState.IN_RIDE) {
        if (passengerProfile.caregiverContact && passengerProfile.caregiverNotifications.rideStartEnd) {
            const message = `Aura Ride Update: ${passengerProfile.name} has successfully arrived at ${rideStatus.destination}.`;
            sendSms(passengerProfile.caregiverContact, message);
        }
    }
  }, [appState, prevAppState, passengerProfile, rideStatus.destination]);


  const handleEmergency = () => {
    if (rideStatus.status === RideCurrentStatus.EMERGENCY) return;
    setRideStatus(prev => ({...prev, status: RideCurrentStatus.EMERGENCY}));
    
    const confirmationText = T('emergencyConfirmed');
    if (voiceOutput) speak(confirmationText, language, voiceSpeed);

    const driverInstruction = "EMERGENCY: Passenger requires immediate assistance. Pull over when safe.";
    const caregiverAlert = "EMERGENCY: Passenger has activated the SOS button.";

    postAuraSystemMessage(confirmationText, {
        driver_instruction: driverInstruction,
        caregiver_alert: caregiverAlert
    });

    if (passengerProfile.caregiverContact && passengerProfile.caregiverNotifications.emergencyAlerts) {
      const message = `Aura Emergency Alert: ${passengerProfile.name} has activated the SOS button during their ride to ${rideStatus.destination}. Location: Near City Center. Please check on them immediately.`;
      sendSms(passengerProfile.caregiverContact, message);
    }
  }

  const handleRouteDecision = (accept: boolean) => {
    if (accept && newRouteSuggestion) {
      setRideStatus(prev => ({
        ...prev,
        etaMinutes: newRouteSuggestion.etaMinutes,
        totalTripMinutes: newRouteSuggestion.etaMinutes,
        routeDescription: newRouteSuggestion.description,
        status: RideCurrentStatus.IN_PROGRESS,
      }));
      postAuraSystemMessage(T('routeAccepted'));
    } else {
      setRideStatus(prev => ({...prev, status: RideCurrentStatus.IN_PROGRESS}));
      postAuraSystemMessage(T('routeDeclined'));
    }
    setNewRouteSuggestion(null);
  }

  const handleCommand = async (command: string) => {
    if (isProcessing || !command) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: command, timestamp: new Date() };
    setMessageLog(prev => [...prev, userMessage]);
    
    if (passengerProfile.preferences.hapticFeedback) {
      navigator.vibrate?.(100);
    }
    
    const lowerCommand = command.toLowerCase();

    if (rideStatus.status === RideCurrentStatus.ROUTE_SUGGESTION) {
        const acceptWords = ['accept', 'yes', 'confirm', 'ok', 'yep', 'sounds good', 'accepter', 'oui'];
        const declineWords = ['decline', 'no', 'reject', 'nope', 'cancel', 'refuser', 'non'];
        
        if (acceptWords.some(word => lowerCommand.includes(word))) {
            handleRouteDecision(true);
            return;
        }
        if (declineWords.some(word => lowerCommand.includes(word))) {
            handleRouteDecision(false);
            return;
        }
    }

    setIsProcessing(true);
    const auraResponseData = await getAuraResponse(command, passengerProfile, rideStatus);
    
    const auraMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'aura',
      text: auraResponseData.response_text,
      timestamp: new Date(),
      auraData: auraResponseData,
    };
    setMessageLog(prev => [...prev, auraMessage]);
    
    if (auraResponseData.intent === 'DESCRIBE_SURROUNDINGS') {
      setVisionRequestTrigger(Date.now());
    }
    
    if (auraResponseData.intent === 'ROUTE_SUGGESTION' && auraResponseData.new_route_details) {
        setNewRouteSuggestion(auraResponseData.new_route_details);
        setRideStatus(prev => ({ ...prev, status: RideCurrentStatus.ROUTE_SUGGESTION }));
    }
    
    if (auraResponseData.intent === 'EMERGENCY') {
        setRideStatus(prev => ({...prev, status: RideCurrentStatus.EMERGENCY}));
    }

    if (passengerProfile.preferences.voiceOutput) {
      const langCode = passengerProfile.preferences.language;
      speak(auraResponseData.response_text, langCode, passengerProfile.preferences.voiceSpeed);
    }
     if (passengerProfile.preferences.hapticFeedback) {
      navigator.vibrate?.([50, 50, 50]);
    }

    setIsProcessing(false);
  };
  
  const renderCurrentScreen = () => {
    if (currentUserRole !== UserRole.PASSENGER) {
        if (appState === AppState.IN_RIDE || appState === AppState.FINISHED || appState === AppState.WAITING) {
            switch(currentUserRole) {
                case UserRole.DRIVER:
                    return <DriverView passengerProfile={passengerProfile} rideStatus={rideStatus} messageLog={messageLog} />;
                case UserRole.CAREGIVER:
                    return <CaregiverView rideStatus={rideStatus} messageLog={messageLog} />;
                default: return null;
            }
        } else {
            return <div className="text-center p-10 text-gray-300">Waiting for passenger to start a ride...</div>
        }
    }
    
    switch (appState) {
      case AppState.BOOKING:
        return <BookingView passengerProfile={passengerProfile} setPassengerProfile={setPassengerProfile} onBooking={handleBooking} />;
      case AppState.CONFIRMING:
        if (!bookingDetails.rideOption) return null;
        return <ConfirmationView 
            rideOption={bookingDetails.rideOption} 
            pickup={bookingDetails.pickup}
            destination={bookingDetails.destination} 
            onConfirm={handleConfirm}
            onCancel={() => setAppState(AppState.BOOKING)}
            lang={passengerProfile.preferences.language}
            passengerProfile={passengerProfile}
        />;
      case AppState.WAITING:
        return <WaitingView onDriverFound={() => setAppState(AppState.IN_RIDE)} driver={rideStatus.driver} />;
      case AppState.IN_RIDE:
        return <PassengerView
          passengerProfile={passengerProfile}
          setPassengerProfile={setPassengerProfile}
          rideStatus={rideStatus}
          handleCommand={handleCommand}
          isProcessing={isProcessing}
          messageLog={messageLog}
          handleEmergency={handleEmergency}
          newRouteSuggestion={newRouteSuggestion}
          handleRouteDecision={handleRouteDecision}
          handleDescribeSurroundings={handleDescribeSurroundings}
          isVisionProcessing={isVisionProcessing}
          visionRequestTrigger={visionRequestTrigger}
          isSpeaking={isSpeaking}
          auraStatus={auraStatus}
          transcript={transcript}
        />;
      case AppState.FINISHED:
          return (
            <div className="text-center p-10 flex flex-col justify-center items-center h-[calc(100vh-80px)]">
                <h2 className="text-3xl font-bold mb-4 text-white">Ride Finished!</h2>
                <p className="text-gray-200">You have arrived at {rideStatus.destination}.</p>
                <button onClick={() => {
                    setAppState(AppState.BOOKING);
                    setMessageLog([]);
                }} className="mt-6 px-6 py-3 bg-[rgb(var(--color-accent-purple))] rounded-lg hover:bg-[rgba(var(--color-accent-purple),0.8)] font-bold transition-colors">
                    Book Another Ride
                </button>
            </div>
          );
      default:
        return <BookingView passengerProfile={passengerProfile} setPassengerProfile={setPassengerProfile} onBooking={handleBooking} />;
    }
  };
  
  const roleIcons: Record<UserRole, React.ReactNode> = {
    [UserRole.PASSENGER]: <FaUser/>,
    [UserRole.DRIVER]: <FaUserCog/>,
    [UserRole.CAREGIVER]: <FaUserNurse/>
  }

  return (
    <div className={`min-h-screen w-full text-white ${passengerProfile.preferences.largeFont ? 'text-lg' : ''}`}>
       <div className="min-h-screen w-full">
        <header className="p-4 bg-black/20 backdrop-blur-md flex justify-between items-center shadow-lg sticky top-0 z-40 border-b border-white/10">
          <h1 className="text-xl md:text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--color-accent-aqua))] to-[rgb(var(--color-accent-purple))]">Aura</h1>
            <div className="flex items-center space-x-4">
                <div className="flex space-x-1 p-1 bg-black/20 rounded-lg border border-white/10">
                    {Object.values(UserRole).map(role => (
                    <button 
                        key={role}
                        onClick={() => setCurrentUserRole(role)}
                        className={`px-3 py-1.5 rounded-md text-sm md:text-base font-semibold flex items-center space-x-2 transition-all duration-300 ${currentUserRole === role ? 'bg-[rgb(var(--color-accent-purple))] text-white shadow-md' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                    {roleIcons[role]} <span className="hidden md:inline">{T(role.toLowerCase())}</span>
                    </button>
                    ))}
                </div>
            </div>
        </header>
        <main>
          {renderCurrentScreen()}
        </main>
       </div>
    </div>
  );
};

export default App;
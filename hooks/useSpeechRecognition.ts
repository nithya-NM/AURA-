import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognitionStatus } from '../types';

// FIX: Add types for the Web Speech API, which may not be part of the default TypeScript DOM library.
// This resolves errors about 'SpeechRecognition' and 'webkitSpeechRecognition' not being found.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type PermissionState = 'granted' | 'prompt' | 'denied';

interface SpeechRecognitionHook {
  isSupported: boolean;
  status: SpeechRecognitionStatus;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  resetTranscript: () => void;
  error: string | null;
  permission: PermissionState;
}

const useSpeechRecognition = (lang: string): SpeechRecognitionHook => {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const manualStop = useRef(false);

  useEffect(() => {
    // Check for permissions API support and query status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          setPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setPermission(permissionStatus.state);
          };
        }).catch(err => {
            console.warn("Permissions API not fully supported for microphone query.", err);
        });
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      // FIX: Set continuous to true to prevent rapid start/stop cycles that cause API rate limiting.
      // The recognizer will now listen continuously until stopped.
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setStatus('listening');
        manualStop.current = false;
      };

      // FIX: Update onresult to only capture the latest FINAL transcript segment.
      // This prevents processing incomplete phrases or growing strings of text.
      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          setTranscript(lastResult[0].transcript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // FIX: Add 'network' to the list of non-critical errors.
        // This allows the `onend` handler to automatically restart the speech recognition service
        // after a transient network issue, improving the application's resilience.
        if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
          // In continuous mode, these are less critical, often just pauses.
          // We let onend handle restart logic.
          return;
        }
        
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setPermission('denied');
        }
        setError(event.error);
        setStatus('error');
      };

      // FIX: Update onend for continuous mode. It now restarts the service on unexpected
      // stops (like browser timeouts) instead of after every spoken phrase.
      recognition.onend = () => {
        if (!manualStop.current && status === 'listening') {
          console.warn('Speech recognition ended unexpectedly. Attempting to restart.');
          // Use a small delay to prevent a tight loop in case of persistent failure.
          setTimeout(() => {
            if (recognitionRef.current && !manualStop.current) {
               startListening();
            }
          }, 500);
        } else {
          setStatus('idle');
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  const startListening = useCallback(() => {
    if (permission === 'denied') {
      setError('not-allowed');
      setStatus('error');
      return;
    }

    if (recognitionRef.current && (status === 'idle' || status === 'error')) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        // This can happen if start() is called while it's already started.
        // The onend/onerror logic should prevent this, but as a safeguard:
        console.warn("Could not start speech recognition:", e);
      }
    }
  }, [status, permission]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && status === 'listening') {
      manualStop.current = true;
      recognitionRef.current.stop();
    }
  }, [status]);
    
  const resetTranscript = useCallback(() => {
      setTranscript('');
  }, []);

  return { isSupported, status, startListening, stopListening, transcript, resetTranscript, error, permission };
};

export default useSpeechRecognition;
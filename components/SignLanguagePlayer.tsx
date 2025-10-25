import React, { useState, useEffect, useMemo } from 'react';
import { SIGN_LANGUAGE_VIDEOS } from '../constants';
import Card from './ui/Card';
import { FaSignLanguage, FaSpinner, FaVideoSlash } from 'react-icons/fa';

interface SignLanguagePlayerProps {
  lastCommand: string;
}

const SignLanguagePlayer: React.FC<SignLanguagePlayerProps> = ({ lastCommand }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const relevantKeyword = useMemo(() => {
    const command = lastCommand.toLowerCase();
    return Object.keys(SIGN_LANGUAGE_VIDEOS).find(keyword => command.includes(keyword)) || null;
  }, [lastCommand]);

  useEffect(() => {
    if (relevantKeyword) {
      setVideoUrl(SIGN_LANGUAGE_VIDEOS[relevantKeyword]);
      setIsLoading(true);
      setHasError(false);
    } else {
      setVideoUrl(null);
      setIsLoading(false);
      setHasError(false);
    }
  }, [relevantKeyword]);

  if (!videoUrl) {
    return (
      <Card className="flex flex-col items-center justify-center text-center h-48">
        <FaSignLanguage className="text-4xl text-gray-400 mb-2" />
        <p className="text-gray-400">Sign language video will appear here when relevant.</p>
      </Card>
    );
  }

  return (
    <Card className="p-2">
      <div className="aspect-video w-full bg-black rounded-lg relative flex items-center justify-center">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white" aria-label="Loading video">
            <FaSpinner className="text-4xl animate-spin" />
          </div>
        )}

        {/* Error Message */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-2">
            <FaVideoSlash className="text-4xl mb-2" />
            <p className="text-center text-sm">Video could not be loaded.</p>
          </div>
        )}
        
        {/* Video Player */}
        <video
          key={videoUrl}
          src={videoUrl}
          onCanPlay={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${isLoading || hasError ? 'opacity-0' : 'opacity-100'}`}
          aria-label={`Sign language video for ${relevantKeyword}`}
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-white text-center mt-2 text-sm">
        Showing sign for: <span className="font-bold capitalize">{relevantKeyword}</span>
      </p>
    </Card>
  );
};

export default SignLanguagePlayer;
import React from 'react';
import { FaMicrophone, FaSpinner } from 'react-icons/fa';
import { AuraStatus } from '../types';

interface AuraStatusIndicatorProps {
  status: AuraStatus;
  isSpeaking: boolean;
}

const AuraStatusIndicator: React.FC<AuraStatusIndicatorProps> = ({ status, isSpeaking }) => {
  const getStatusStyle = () => {
    if (isSpeaking) {
      return {
        icon: <FaMicrophone />,
        text: 'Speaking',
        color: 'bg-green-500',
        animation: 'animate-voice-pulse',
      };
    }
    switch (status) {
      case 'LISTENING':
        return {
          icon: <FaMicrophone />,
          text: 'Listening',
          color: 'bg-yellow-500',
          animation: 'animate-pulse',
        };
      case 'PROCESSING':
        return {
          icon: <FaSpinner className="animate-spin" />,
          text: 'Processing',
          color: 'bg-[rgb(var(--color-accent-aqua))]',
          animation: '',
        };
      case 'ERROR':
        return {
          icon: '!',
          text: 'Error',
          color: 'bg-red-500',
          animation: '',
        };
      case 'PASSIVE':
      default:
        return {
          icon: <FaMicrophone />,
          text: 'Aura',
          color: 'bg-[rgb(var(--color-accent-purple))]',
          animation: 'animate-calm-glow',
        };
    }
  };

  const { icon, color, animation } = getStatusStyle();

  return (
    <div className="flex-shrink-0">
      <div
        className={`w-16 h-14 flex items-center justify-center rounded-lg text-white font-bold text-2xl transition-colors ${color} ${animation}`}
        aria-label={`Aura status: ${status}`}
      >
        {icon}
      </div>
    </div>
  );
};

export default AuraStatusIndicator;



import React from 'react';
import { AccessibilityPreferences, Language } from '../types';
import Card from './ui/Card';
import { l } from '../services/localization';
import { FaUniversalAccess } from 'react-icons/fa';

interface AccessibilityPanelProps {
  preferences: AccessibilityPreferences;
  onPreferencesChange: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ preferences, onPreferencesChange }) => {
  const T = l(preferences.language);
  
  // FIX: Added a map to display full language names in the UI,
  // since the Language enum now uses short codes ('en', 'fr', 'ta').
  const langDisplayMap: Record<Language, string> = {
    [Language.EN]: 'English',
    [Language.FR]: 'French',
    [Language.TA]: 'Tamil',
  };

  const Toggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
      <label className="font-medium text-white">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-[rgb(var(--color-accent-purple))]' : 'bg-gray-600'}`}
      >
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <Card>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
        <FaUniversalAccess className="mr-2 text-[rgb(var(--color-accent-aqua))]" />
        {T('accessibilitySettings')}
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
          <label className="font-medium text-white">{T('language')}</label>
          <select
            value={preferences.language}
            onChange={(e) => onPreferencesChange('language', e.target.value as Language)}
            className="bg-gray-900 text-white rounded-md border-gray-600 focus:ring-[rgb(var(--color-accent-purple))] focus:border-[rgb(var(--color-accent-purple))]"
          >
            {Object.values(Language).map(lang => <option key={lang} value={lang}>{langDisplayMap[lang]}</option>)}
          </select>
        </div>
        
        <Toggle label={T('largeFont')} checked={preferences.largeFont} onChange={(val) => onPreferencesChange('largeFont', val)} />
        <Toggle label={T('voiceOutput')} checked={preferences.voiceOutput} onChange={(val) => onPreferencesChange('voiceOutput', val)} />
        <Toggle label={T('hapticFeedback')} checked={preferences.hapticFeedback} onChange={(val) => onPreferencesChange('hapticFeedback', val)} />
        <Toggle label={T('signLanguage')} checked={preferences.signLanguage} onChange={(val) => onPreferencesChange('signLanguage', val)} />

        {preferences.voiceOutput && (
          <div className="bg-gray-700/50 p-3 rounded-lg">
            <label className="font-medium text-white block mb-2">{T('voiceSpeed')}</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={preferences.voiceSpeed}
              onChange={(e) => onPreferencesChange('voiceSpeed', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[rgb(var(--color-accent-purple))]"
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default AccessibilityPanel;
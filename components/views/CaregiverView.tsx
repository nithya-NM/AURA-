import React, { useState, useEffect } from 'react';
import { RideStatus, Message, Language, RideCurrentStatus } from '../../types';
import Card from '../ui/Card';
import LiveMap from '../LiveMap';
import CameraFeed from '../CameraFeed';
import { l } from '../../services/localization';
import { FaMapMarkedAlt, FaBell, FaVideo, FaEye, FaEyeSlash } from 'react-icons/fa';
import ProgressBar from '../ui/ProgressBar';

interface CaregiverViewProps {
  rideStatus: RideStatus;
  messageLog: Message[];
}

const CaregiverView: React.FC<CaregiverViewProps> = ({ rideStatus, messageLog }) => {
  const T = l(Language.EN); // Caregiver UI in English
  const [isCameraVisible, setCameraVisible] = useState(false);

  const caregiverAlerts = messageLog
    .map(msg => ({ alert: msg.auraData?.caregiver_alert, time: msg.timestamp }))
    .filter((item): item is { alert: string; time: Date } => !!item.alert)
    .reverse();

  const isEmergency = rideStatus.status === RideCurrentStatus.EMERGENCY;
  const progress = rideStatus.totalTripMinutes > 0
    ? ((rideStatus.totalTripMinutes - rideStatus.etaMinutes) / rideStatus.totalTripMinutes) * 100
    : (rideStatus.status === RideCurrentStatus.FINISHED ? 100 : 0);

  useEffect(() => {
    if (isEmergency) {
        setCameraVisible(true);
    }
  }, [isEmergency]);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-white">{T('remoteMonitoring')}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                <FaMapMarkedAlt className="mr-2 text-[rgb(var(--color-accent-aqua))]"/> {T('currentStatus')}
            </h3>
            <div className="space-y-3 text-gray-200">
                <p><strong>{T('destination')}:</strong> {rideStatus.destination}</p>
                <p><strong>{T('eta')}:</strong> {rideStatus.etaMinutes > 0 ? `${rideStatus.etaMinutes} ${T('minutes')}`: T('finished')}</p>
                <p><strong>Status:</strong> <span className={`font-bold ${isEmergency ? 'text-[rgb(var(--color-accent-red))]' : rideStatus.status === RideCurrentStatus.FINISHED ? 'text-[rgb(var(--color-accent-aqua))]' : 'text-green-400'}`}>
                  {isEmergency ? T('emergencyAlert') : rideStatus.status === RideCurrentStatus.FINISHED ? T('finished') : T('inProgress')}
                </span></p>
                
                <div className="pt-2">
                  <div className="flex justify-between mb-1 text-sm font-medium text-gray-300">
                      <span>{T('tripProgress')}</span>
                      <span>{Math.round(progress)}%</span>
                  </div>
                  <ProgressBar progress={progress} />
                </div>
            </div>
          </Card>
          <LiveMap />
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-bold flex items-center transition-colors ${isEmergency ? 'text-[rgb(var(--color-accent-red))] animate-pulse' : 'text-white'}`}>
                    <FaVideo className="mr-2"/> {T('liveCameraFeed')}
                </h3>
                <button 
                    onClick={() => setCameraVisible(!isCameraVisible)} 
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    aria-label={isCameraVisible ? "Hide camera feed" : "Show camera feed"}
                    aria-expanded={isCameraVisible}
                >
                    {isCameraVisible ? <FaEyeSlash /> : <FaEye />}
                </button>
            </div>
            {isCameraVisible && (
                <div className="mt-4">
                    <CameraFeed />
                </div>
            )}
          </Card>

          <Card>
             <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                <FaBell className="mr-2 text-[rgb(var(--color-accent-aqua))]"/> {T('notifications')}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {caregiverAlerts.length > 0 ? (
                    caregiverAlerts.map((item, index) => (
                        <div key={index} className={`p-3 rounded-lg ${item.alert.toLowerCase().includes('emergency') ? 'bg-red-900/70 border-l-4 border-red-500' : 'bg-gray-900'}`}>
                            <p className="text-white">{item.alert}</p>
                            <p className="text-xs text-gray-400 mt-1">{item.time.toLocaleTimeString()}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">No critical notifications yet.</p>
                )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaregiverView;
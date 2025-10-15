import React, { createContext, useContext, useState, useEffect, ReactNode, FC } from 'react';
import { Alert } from 'react-native';
import VoIPService, { CallData } from './voipService';
import { useAuth } from './authContext';

interface VoIPContextType {
  incomingCall: CallData | null;
  activeCall: CallData | null;
  setActiveCall: (call: CallData | null) => void;
  dismissIncomingCall: () => void;
}

const VoIPContext = createContext<VoIPContextType>({
  incomingCall: null,
  activeCall: null,
  setActiveCall: () => {},
  dismissIncomingCall: () => {},
});

export const useVoIP = () => {
  const context = useContext(VoIPContext);
  if (!context) {
    throw new Error('useVoIP must be used within a VoIPProvider');
  }
  return context;
};

interface VoIPProviderProps {
  children: ReactNode;
}

export const VoIPProvider: FC<VoIPProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [handledCalls, setHandledCalls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      setActiveCall(null);
      setHandledCalls(new Set());
      return;
    }

    console.log('VoIPProvider: Setting up global incoming call listener for user:', user.uid);

    // Listen for incoming calls globally
    const unsubscribe = VoIPService.listenForIncomingCalls(user.uid, (callData) => {
      console.log('VoIPProvider: Received call data:', callData);
      
      // Ignore if we already handled this call
      if (handledCalls.has(callData.callId)) {
        console.log('VoIPProvider: Call already handled, ignoring:', callData.callId);
        return;
      }

      // Ignore if call is not in ringing state
      if (callData.status !== 'ringing') {
        console.log('VoIPProvider: Call status is not ringing, ignoring:', callData.status);
        return;
      }

      // Ignore if there's already an active call
      if (activeCall && activeCall.callId !== callData.callId) {
        console.log('VoIPProvider: Already in a call, auto-rejecting:', callData.callId);
        VoIPService.rejectCall(callData.callId);
        return;
      }

      console.log('VoIPProvider: Showing incoming call:', callData.callId);
      setIncomingCall(callData);
      
      // Mark this call as handled
      setHandledCalls(prev => new Set(prev).add(callData.callId));
    });

    return () => {
      console.log('VoIPProvider: Cleaning up call listener');
      unsubscribe();
    };
  }, [user, activeCall, handledCalls]);

  // Monitor active call status changes
  useEffect(() => {
    if (!activeCall) return;

    console.log('VoIPProvider: Monitoring active call status:', activeCall.callId);

    const unsubscribe = VoIPService.listenToCallStatus(activeCall.callId, (updatedCallData) => {
      console.log('VoIPProvider: Call status updated:', updatedCallData);
      
      // Update active call data
      setActiveCall(updatedCallData);

      // If call ended, rejected, or missed, clear it
      if (updatedCallData.status === 'ended' || 
          updatedCallData.status === 'rejected' || 
          updatedCallData.status === 'missed') {
        console.log('VoIPProvider: Call finished, clearing active call');
        setTimeout(() => {
          setActiveCall(null);
        }, 1000); // Small delay to allow UI to update
      }
    });

    return () => {
      console.log('VoIPProvider: Cleaning up call status listener');
      unsubscribe();
    };
  }, [activeCall?.callId]);

  // Monitor incoming call status changes
  useEffect(() => {
    if (!incomingCall) return;

    console.log('VoIPProvider: Monitoring incoming call status:', incomingCall.callId);

    const unsubscribe = VoIPService.listenToCallStatus(incomingCall.callId, (updatedCallData) => {
      console.log('VoIPProvider: Incoming call status updated:', updatedCallData);
      
      // If call was cancelled by caller or status changed from ringing, dismiss the incoming call modal
      if (updatedCallData.status !== 'ringing') {
        console.log('VoIPProvider: Incoming call no longer ringing, dismissing');
        setIncomingCall(null);
      }
    });

    return () => {
      console.log('VoIPProvider: Cleaning up incoming call status listener');
      unsubscribe();
    };
  }, [incomingCall?.callId]);

  const dismissIncomingCall = () => {
    console.log('VoIPProvider: Dismissing incoming call');
    setIncomingCall(null);
  };

  const value: VoIPContextType = {
    incomingCall,
    activeCall,
    setActiveCall,
    dismissIncomingCall,
  };

  return <VoIPContext.Provider value={value}>{children}</VoIPContext.Provider>;
};


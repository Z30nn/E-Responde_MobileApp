import React, { createContext, useContext, useState, useEffect, ReactNode, FC, useRef } from 'react';
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
  const handledCallsRef = useRef<Set<string>>(new Set());
  const activeCallRef = useRef<CallData | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      setActiveCall(null);
      handledCallsRef.current = new Set();
      return;
    }

    console.log('VoIPProvider: Setting up global incoming call listener for user:', user.uid);

    // Listen for incoming calls globally
    const unsubscribe = VoIPService.listenForIncomingCalls(user.uid, (callData) => {
      console.log('VoIPProvider: Received call data:', callData);
      
      // Check if we already handled this call
      if (handledCallsRef.current.has(callData.callId)) {
        console.log('VoIPProvider: Call already handled, ignoring:', callData.callId);
        return;
      }
      
      // Ignore if call is not in ringing state
      if (callData.status !== 'ringing') {
        console.log('VoIPProvider: Call status is not ringing, ignoring:', callData.status);
        return;
      }

      // Check if there's already an active call
      if (activeCallRef.current && activeCallRef.current.callId !== callData.callId) {
        console.log('VoIPProvider: Already in a call, auto-rejecting:', callData.callId);
        VoIPService.rejectCall(callData.callId);
        return;
      }

      console.log('VoIPProvider: Showing incoming call:', callData.callId);
      
      // Mark this call as handled FIRST
      handledCallsRef.current.add(callData.callId);
      
      // Then show the incoming call
      setIncomingCall(callData);
    });

    return () => {
      console.log('VoIPProvider: Cleaning up call listener');
      unsubscribe();
    };
  }, [user?.uid]);

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
        
        // Remove from handled calls after a delay to allow for final status updates
        setTimeout(() => {
          handledCallsRef.current.delete(updatedCallData.callId);
          console.log('VoIPProvider: Removed call from handled list:', updatedCallData.callId);
        }, 3000);
        
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
        
        // Remove from handled calls after a delay
        setTimeout(() => {
          handledCallsRef.current.delete(updatedCallData.callId);
          console.log('VoIPProvider: Removed incoming call from handled list:', updatedCallData.callId);
        }, 2000);
      }
    });

    return () => {
      console.log('VoIPProvider: Cleaning up incoming call status listener');
      unsubscribe();
    };
  }, [incomingCall?.callId]);

  const dismissIncomingCall = () => {
    console.log('VoIPProvider: Dismissing incoming call');
    if (incomingCall) {
      // Remove from handled calls when manually dismissed
      setTimeout(() => {
        handledCallsRef.current.delete(incomingCall.callId);
        console.log('VoIPProvider: Removed dismissed call from handled list:', incomingCall.callId);
      }, 2000);
    }
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


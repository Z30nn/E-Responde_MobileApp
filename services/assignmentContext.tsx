import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useAuth } from './authContext';
import { CrimeReport, FirebaseService } from './firebaseService';

interface AssignmentContextType {
  currentAssignment: CrimeReport | null;
  showAssignmentModal: boolean;
  acceptAssignment: (reportId: string) => void;
  declineAssignment: (reportId: string) => void;
  timeoutAssignment: (reportId: string) => void;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

export const useAssignment = () => {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error('useAssignment must be used within an AssignmentProvider');
  }
  return context;
};

interface AssignmentProviderProps {
  children: React.ReactNode;
}

export const AssignmentProvider: React.FC<AssignmentProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentAssignment, setCurrentAssignment] = useState<CrimeReport | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Listen for assignment changes
  useEffect(() => {
    if (!user) {
      setCurrentAssignment(null);
      setShowAssignmentModal(false);
      return;
    }

    console.log('AssignmentProvider: Setting up listener for police:', user.uid);
    const policeRef = ref(database, `police/police account/${user.uid}`);
    
    const handleAssignmentChange = async (snapshot: any) => {
      if (snapshot.exists()) {
        const policeData = snapshot.val();
        console.log('AssignmentProvider: Police data received:', policeData);
        
        console.log('AssignmentProvider: currentAssignment:', policeData.currentAssignment);
        
        // Check if there's a current assignment and police is available (not dispatched)
        const hasAssignment = policeData.currentAssignment && policeData.currentAssignment.reportId;
        const isAvailable = policeData.status === 'Available';
        
        console.log('AssignmentProvider: hasAssignment:', hasAssignment);
        console.log('AssignmentProvider: police status:', policeData.status);
        console.log('AssignmentProvider: isAvailable:', isAvailable);
        console.log('AssignmentProvider: assignment reportId:', policeData.currentAssignment?.reportId);
        
        if (hasAssignment && isAvailable) {
          const reportId = policeData.currentAssignment.reportId;
          console.log('AssignmentProvider: New assignment detected:', reportId);
          
          try {
            // Fetch the full crime report details
            const crimeReport = await FirebaseService.getCrimeReport(reportId);
            if (crimeReport) {
              console.log('AssignmentProvider: Crime report fetched:', crimeReport);
              setCurrentAssignment(crimeReport);
              setShowAssignmentModal(true);
            } else {
              console.log('AssignmentProvider: Crime report not found');
            }
          } catch (error) {
            console.error('AssignmentProvider: Error fetching crime report:', error);
          }
        } else {
          if (hasAssignment && !isAvailable) {
            console.log('AssignmentProvider: Has assignment but police is already dispatched - not showing modal');
          } else {
            console.log('AssignmentProvider: No current assignment');
          }
          setCurrentAssignment(null);
          setShowAssignmentModal(false);
        }
      } else {
        console.log('AssignmentProvider: Police data not found');
        setCurrentAssignment(null);
        setShowAssignmentModal(false);
      }
    };

    onValue(policeRef, handleAssignmentChange);

    return () => {
      off(policeRef, 'value', handleAssignmentChange);
    };
  }, [user]);

  const acceptAssignment = useCallback(async (reportId: string) => {
    console.log('AssignmentProvider: Accepting assignment for report:', reportId);
    setShowAssignmentModal(false);
    setCurrentAssignment(null);
    
    // The modal component will handle the status update
    // This callback is just for cleanup
  }, []);

  const declineAssignment = useCallback(async (reportId: string) => {
    console.log('AssignmentProvider: Declining assignment for report:', reportId);
    setShowAssignmentModal(false);
    setCurrentAssignment(null);
    
    // The modal component will handle removing the assignment
    // This callback is just for cleanup
  }, []);

  const timeoutAssignment = useCallback(async (reportId: string) => {
    console.log('AssignmentProvider: Assignment timed out for report:', reportId);
    setShowAssignmentModal(false);
    setCurrentAssignment(null);
    
    // The modal component will handle removing the assignment
    // This callback is just for cleanup
  }, []);

  const value: AssignmentContextType = {
    currentAssignment,
    showAssignmentModal,
    acceptAssignment,
    declineAssignment,
    timeoutAssignment,
  };

  return (
    <AssignmentContext.Provider value={value}>
      {children}
    </AssignmentContext.Provider>
  );
};

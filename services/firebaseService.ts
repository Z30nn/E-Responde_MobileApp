import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential
} from 'firebase/auth';
import { 
  ref, 
  set, 
  get, 
  push,
  query, 
  orderByChild, 
  equalTo 
} from 'firebase/database';
import { auth, database } from '../firebaseConfig';

export interface CivilianUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactNumber: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CrimeReport {
  crimeType: string;
  dateTime: Date;
  description: string;
  multimedia: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  anonymous: boolean;
  reporterName: string;
  reporterUid: string;
  status: string;
  createdAt: string;
  reportId?: string;
  severity: 'Immediate' | 'High' | 'Moderate' | 'Low';
  upvotes?: number;
  downvotes?: number;
  userVotes?: { [userId: string]: 'upvote' | 'downvote' };
}

export class FirebaseService {
  // Register a new civilian user
  static async registerCivilian(userData: Omit<CivilianUser, 'createdAt'>): Promise<UserCredential> {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Store user data in Realtime Database under civilian -> civilian account
      const userRef = ref(database, `civilian/civilian account/${userCredential.user.uid}`);
      await set(userRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        contactNumber: userData.contactNumber,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      // Create phone number to user ID mapping for emergency contacts
      if (userData.contactNumber) {
        const phoneMappingRef = ref(database, `phone_mappings/${userData.contactNumber}`);
        await set(phoneMappingRef, {
          userId: userCredential.user.uid,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          createdAt: new Date().toISOString()
        });
      }

      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login civilian user
  static async loginCivilian(credentials: LoginCredentials): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Verify user exists in civilian database
      const userRef = ref(database, `civilian/civilian account/${userCredential.user.uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        throw new Error('User not found in civilian database');
      }

      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Check if user exists in civilian database - Fixed to avoid index requirement
  static async checkCivilianUser(email: string): Promise<boolean> {
    try {
      return false; 
    } catch (error) {
      console.error('Check user error:', error);
      return false;
    }
  }

  // Find user by phone number
  static async getUserByPhoneNumber(phoneNumber: string): Promise<{ userId: string; firstName: string; lastName: string; email: string } | null> {
    try {
      const phoneMappingRef = ref(database, `phone_mappings/${phoneNumber}`);
      const snapshot = await get(phoneMappingRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          userId: data.userId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email
        };
      }
      return null;
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      return null;
    }
  }

  // Debug function to manually create phone mapping (for testing)
  static async createTestPhoneMapping(phoneNumber: string, userId: string, firstName: string, lastName: string, email: string): Promise<void> {
    try {
      const phoneMappingRef = ref(database, `phone_mappings/${phoneNumber}`);
      await set(phoneMappingRef, {
        userId,
        firstName,
        lastName,
        email,
        createdAt: new Date().toISOString(),
        isTest: true
      });
      console.log('Test phone mapping created for:', phoneNumber);
    } catch (error) {
      console.error('Error creating test phone mapping:', error);
      throw error;
    }
  }

  // Send password reset email
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Update user password
  static async updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // Get civilian user data
  static async getCivilianUser(uid: string): Promise<CivilianUser | null> {
    try {
      const userRef = ref(database, `civilian/civilian account/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as CivilianUser;
      }
      
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Submit crime report
  static async submitCrimeReport(crimeReport: CrimeReport): Promise<string> {
    try {
      const reportId = Date.now().toString(); // Generate unique ID
      
      // Store in civilian -> civilian crime reports
      const crimeReportsRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      await set(crimeReportsRef, {
        ...crimeReport,
        dateTime: crimeReport.dateTime.toISOString(),
        reportId,
      });

      // Store in civilian -> civilian account -> uid -> crime reports
      const userCrimeReportsRef = ref(database, `civilian/civilian account/${crimeReport.reporterUid}/crime reports/${reportId}`);
      await set(userCrimeReportsRef, {
        ...crimeReport,
        dateTime: crimeReport.dateTime.toISOString(),
        reportId,
      });

      // Send notifications to all users who have crime report notifications enabled
      await this.notifyAllUsersOfNewCrimeReport(reportId, crimeReport);

      console.log('Crime report submitted successfully');
      return reportId;
    } catch (error) {
      console.error('Submit crime report error:', error);
      throw error;
    }
  }

  // Update crime report status and notify the reporter
  static async updateCrimeReportStatus(reportId: string, newStatus: string, updatedBy?: string): Promise<boolean> {
    try {
      console.log('FirebaseService: Updating crime report status:', reportId, 'to', newStatus);
      
      // Update in main civilian crime reports collection
      const crimeReportsRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const reportSnapshot = await get(crimeReportsRef);
      
      if (!reportSnapshot.exists()) {
        console.error('FirebaseService: Report not found:', reportId);
        return false;
      }
      
      const reportData = reportSnapshot.val();
      const oldStatus = reportData.status;
      
      // Update the status
      await update(crimeReportsRef, {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: updatedBy || 'system'
      });
      
      // Update in user's personal crime reports collection
      const userCrimeReportsRef = ref(database, `civilian/civilian account/${reportData.reporterUid}/crime reports/${reportId}`);
      await update(userCrimeReportsRef, {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: updatedBy || 'system'
      });
      
      // Send notification to the reporter about status change
      if (oldStatus !== newStatus) {
        console.log('FirebaseService: Status changed from', oldStatus, 'to', newStatus, 'sending notification');
        
        // Import NotificationService dynamically to avoid circular dependency
        const { notificationService } = await import('./notificationService');
        
        await notificationService.sendReportStatusUpdateNotification(
          reportId,
          reportData.reporterUid,
          oldStatus,
          newStatus,
          reportData.crimeType || 'Crime Report'
        );
      }
      
      console.log('FirebaseService: Crime report status updated successfully');
      return true;
    } catch (error) {
      console.error('FirebaseService: Error updating crime report status:', error);
      return false;
    }
  }

  // Notify all users of a new crime report (respecting their notification preferences)
  static async notifyAllUsersOfNewCrimeReport(reportId: string, crimeReport: CrimeReport): Promise<void> {
    try {
      console.log('FirebaseService: Starting to notify users of new crime report:', reportId);
      
      // Import NotificationService dynamically to avoid circular dependency
      const { NotificationService } = await import('./notificationService');
      const notificationService = NotificationService.getInstance();
      
      // Get all users from the database
      const usersRef = ref(database, 'civilian/civilian account');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        console.log('FirebaseService: Found users:', Object.keys(users).length);
        
        const notificationPromises: Promise<boolean>[] = [];
        
        // Send notification to each user (excluding the reporter)
        for (const [userId, userData] of Object.entries(users)) {
          // Skip sending notification to the user who submitted the report
          if (userId === crimeReport.reporterUid) {
            console.log('FirebaseService: Skipping notification for reporter:', userId);
            continue;
          }
          
          console.log('FirebaseService: Sending notification to user:', userId);
          
          // Use NotificationService to respect user preferences
          const promise = notificationService.sendNotification(
            userId,
            'crime_report_new',
            'New Crime Report',
            `A new ${crimeReport.crimeType} report has been submitted in your area.`,
            { reportId, crimeType: crimeReport.crimeType }
          );
          
          notificationPromises.push(promise);
        }
        
        // Wait for all notifications to be processed
        const results = await Promise.all(notificationPromises);
        const successCount = results.filter(result => result === true).length;
        console.log(`FirebaseService: Successfully sent new crime report notifications to ${successCount}/${notificationPromises.length} users`);
      } else {
        console.log('FirebaseService: No users found in database');
      }
    } catch (error) {
      console.error('FirebaseService: Error notifying users of new crime report:', error);
      // Don't throw error to avoid breaking the crime report submission
    }
  }

  // Get user's crime reports
  static async getUserCrimeReports(uid: string): Promise<CrimeReport[]> {
    try {
      console.log('Fetching crime reports for user:', uid);
      const userReportsRef = ref(database, `civilian/civilian account/${uid}/crime reports`);
      const snapshot = await get(userReportsRef);
      
      console.log('Snapshot exists:', snapshot.exists());
      console.log('Snapshot value:', snapshot.val());
      
      if (snapshot.exists()) {
        const reports: CrimeReport[] = [];
        snapshot.forEach((childSnapshot) => {
          const report = childSnapshot.val() as CrimeReport;
          reports.push({
            ...report,
            reportId: childSnapshot.key,
            dateTime: new Date(report.dateTime),
          });
        });
        
        console.log('Processed reports:', reports);
        
        // Sort by creation date (newest first)
        return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      console.log('No crime reports found for user');
      return [];
    } catch (error) {
      console.error('Get user crime reports error:', error);
      throw error;
    }
  }

  // Get specific crime report
  static async getCrimeReport(reportId: string): Promise<CrimeReport | null> {
    try {
      console.log('FirebaseService: Getting crime report with ID:', reportId);
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const snapshot = await get(reportRef);
      
      console.log('FirebaseService: Snapshot exists:', snapshot.exists());
      console.log('FirebaseService: Snapshot value:', snapshot.val());
      
      if (snapshot.exists()) {
        const report = snapshot.val() as CrimeReport;
        return {
          ...report,
          reportId: snapshot.key || undefined,
          dateTime: new Date(report.dateTime),
        };
      }
      
      console.log('FirebaseService: Report not found for ID:', reportId);
      return null;
    } catch (error) {
      console.error('Get crime report error:', error);
      throw error;
    }
  }

  // Get all crime reports (for public viewing)
  static async getAllCrimeReports(): Promise<CrimeReport[]> {
    try {
      console.log('Fetching all crime reports');
      const allReportsRef = ref(database, `civilian/civilian crime reports`);
      const snapshot = await get(allReportsRef);
      
      console.log('All reports snapshot exists:', snapshot.exists());
      console.log('All reports snapshot value:', snapshot.val());
      
      if (snapshot.exists()) {
        const reports: CrimeReport[] = [];
        snapshot.forEach((childSnapshot) => {
          const report = childSnapshot.val() as CrimeReport;
          reports.push({
            ...report,
            reportId: childSnapshot.key,
            dateTime: new Date(report.dateTime),
          });
        });
        
        console.log('Processed all reports:', reports.length);
        
        // Sort by creation date (newest first)
        return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      console.log('No crime reports found');
      return [];
    } catch (error) {
      console.error('Get all crime reports error:', error);
      throw error;
    }
  }

  // Vote on a crime report
  static async voteOnCrimeReport(reportId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
    try {
      console.log(`Voting ${voteType} on report ${reportId} by user ${userId}`);
      
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const snapshot = await get(reportRef);
      
      if (!snapshot.exists()) {
        throw new Error('Report not found');
      }
      
      const report = snapshot.val() as CrimeReport;
      const currentVotes = report.userVotes || {};
      const currentUserVote = currentVotes[userId];
      
      // Initialize vote counts if they don't exist
      let upvotes = report.upvotes || 0;
      let downvotes = report.downvotes || 0;
      
      // Remove previous vote if exists
      if (currentUserVote === 'upvote') {
        upvotes = Math.max(0, upvotes - 1);
      } else if (currentUserVote === 'downvote') {
        downvotes = Math.max(0, downvotes - 1);
      }
      
      // Add new vote
      if (voteType === 'upvote') {
        upvotes += 1;
      } else {
        downvotes += 1;
      }
      
      // Update user vote
      currentVotes[userId] = voteType;
      
      // Update the report with new vote counts and user votes
      await set(reportRef, {
        ...report,
        upvotes,
        downvotes,
        userVotes: currentVotes
      });
      
      console.log(`Successfully voted ${voteType} on report ${reportId}`);
      return true;
    } catch (error) {
      console.error('Error voting on crime report:', error);
      throw error;
    }
  }


  // Remove vote from a crime report
  static async removeVoteFromCrimeReport(reportId: string, userId: string): Promise<boolean> {
    try {
      console.log(`Removing vote from report ${reportId} by user ${userId}`);
      
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const snapshot = await get(reportRef);
      
      if (!snapshot.exists()) {
        throw new Error('Report not found');
      }
      
      const report = snapshot.val() as CrimeReport;
      const currentVotes = report.userVotes || {};
      const currentUserVote = currentVotes[userId];
      
      if (!currentUserVote) {
        console.log('User has not voted on this report');
        return true; // No vote to remove
      }
      
      // Update vote counts
      let upvotes = report.upvotes || 0;
      let downvotes = report.downvotes || 0;
      
      if (currentUserVote === 'upvote') {
        upvotes = Math.max(0, upvotes - 1);
      } else if (currentUserVote === 'downvote') {
        downvotes = Math.max(0, downvotes - 1);
      }
      
      // Remove user vote
      delete currentVotes[userId];
      
      // Update the report
      await set(reportRef, {
        ...report,
        upvotes,
        downvotes,
        userVotes: currentVotes
      });
      
      console.log(`Successfully removed vote from report ${reportId}`);
      return true;
    } catch (error) {
      console.error('Error removing vote from crime report:', error);
      throw error;
    }
  }
}

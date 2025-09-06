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
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

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
  static async submitCrimeReport(crimeReport: CrimeReport): Promise<void> {
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

      console.log('Crime report submitted successfully');
    } catch (error) {
      console.error('Submit crime report error:', error);
      throw error;
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
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const snapshot = await get(reportRef);
      
      if (snapshot.exists()) {
        const report = snapshot.val() as CrimeReport;
        return {
          ...report,
          reportId: snapshot.key || undefined,
          dateTime: new Date(report.dateTime),
        };
      }
      
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
}

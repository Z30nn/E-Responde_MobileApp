import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential,
  User,
  signOut
} from 'firebase/auth';
import { 
  ref, 
  set, 
  get, 
  update
} from 'firebase/database';
import { auth, database } from '../firebaseConfig';
import RNFS from 'react-native-fs';

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

export interface PoliceUser {
  uid: string;
  email: string;
  badgeNumber?: string;
  firstName?: string;
  lastName?: string;
  station?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
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
  respondingOfficerId?: string;
  respondingOfficerName?: string;
  respondingOfficerBadgeNumber?: string;
}

export class FirebaseService {
  // Info about image storage in Realtime Database
  static getImageStorageInfo(): { maxSize: number; supportedFormats: string[] } {
    return {
      maxSize: 1 * 1024 * 1024, // 1MB max for base64 in Realtime Database
      supportedFormats: ['image/jpeg', 'image/jpg', 'image/png']
    };
  }

  // Convert image to base64 for Realtime Database storage
  static async convertImageToBase64(fileUri: string, fileName: string): Promise<string> {
    try {
      console.log('=== CONVERTING IMAGE TO BASE64 ===');
      console.log('File URI:', fileUri);
      console.log('File Name:', fileName);
      
      // Read the file and convert to base64
      const base64 = await RNFS.readFile(fileUri, 'base64');
      
      // Add data URL prefix for proper format
      const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64DataUrl = `data:${mimeType};base64,${base64}`;
      
      console.log('Base64 conversion successful, size:', base64DataUrl.length, 'characters');
      
      // Check size limit (1MB for Realtime Database)
      const maxSize = this.getImageStorageInfo().maxSize;
      if (base64DataUrl.length > maxSize) {
        throw new Error(`Image is too large (${(base64DataUrl.length / 1024 / 1024).toFixed(2)}MB). Maximum size for Realtime Database is 1MB. Please compress the image.`);
      }
      
      return base64DataUrl;
    } catch (error: any) {
      console.error('Error converting image to base64:', error);
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }

  // Process images for Realtime Database storage
  static async processImagesForDatabase(files: Array<{uri: string, name: string, type: string}>): Promise<string[]> {
    try {
      console.log(`=== PROCESSING ${files.length} IMAGES FOR REALTIME DATABASE ===`);
      
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to process images');
      }
      
      const base64Images: string[] = [];
      const errors: string[] = [];
      
      // Process files sequentially to avoid memory issues
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`Processing image ${i + 1}/${files.length}: ${file.name}`);
          
          // Validate file type
          if (!file.type || (!file.type.startsWith('image/'))) {
            throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Only images are allowed.`);
          }
          
          // Convert to base64
          const base64DataUrl = await this.convertImageToBase64(file.uri, file.name);
          base64Images.push(base64DataUrl);
          
          console.log(`Image ${i + 1} processed successfully`);
        } catch (error: any) {
          console.error(`Error processing image ${i + 1} (${file.name}):`, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }
      
      if (errors.length > 0) {
        console.warn('Some images failed to process:', errors);
        
        if (base64Images.length === 0) {
          throw new Error(`All images failed to process:\n${errors.join('\n')}`);
        } else {
          console.log(`Successfully processed ${base64Images.length}/${files.length} images`);
        }
      }
      
      console.log('Image processing completed');
      return base64Images;
    } catch (error) {
      console.error('Error processing images for database:', error);
      throw error;
    }
  }

  // Process multiple files for Realtime Database storage (replaces uploadMultipleFiles)
  static async processMultipleFiles(files: Array<{uri: string, name: string, type: string}>): Promise<string[]> {
    try {
      console.log(`Processing ${files.length} files for Realtime Database storage`);
      
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to process files');
      }
      
      // Validate files before processing
      for (const file of files) {
        if (!file.uri || !file.name) {
          throw new Error('Invalid file data: missing URI or name');
        }
        
        // Only allow images for Realtime Database storage
        if (!file.type || !file.type.startsWith('image/')) {
          throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Only images are allowed for Realtime Database storage.`);
        }
      }
      
      // Process images for database storage
      const base64Images = await this.processImagesForDatabase(files);
      
      console.log('File processing completed');
      return base64Images;
    } catch (error) {
      console.error('Error processing multiple files:', error);
      throw error;
    }
  }


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

  // Check if user is police or civilian
  static async getUserType(uid: string): Promise<'police' | 'civilian' | null> {
    try {
      // Check police database first
      const policeRef = ref(database, `police/police account/${uid}`);
      const policeSnapshot = await get(policeRef);
      
      if (policeSnapshot.exists()) {
        return 'police';
      }

      // Check civilian database
      const civilianRef = ref(database, `civilian/civilian account/${uid}`);
      const civilianSnapshot = await get(civilianRef);
      
      if (civilianSnapshot.exists()) {
        return 'civilian';
      }

      return null;
    } catch (error) {
      console.error('Error checking user type:', error);
      return null;
    }
  }

  // Check if email belongs to police account
  static async isPoliceEmail(email: string): Promise<boolean> {
    try {
      const policeRef = ref(database, 'police/police account');
      const snapshot = await get(policeRef);
      
      if (snapshot.exists()) {
        const police = snapshot.val();
        for (const userId in police) {
          if (police[userId].email?.toLowerCase() === email.toLowerCase()) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking police email:', error);
      // If we get permission denied, assume it's not a police email
      // This will be handled by the authentication flow
      return false;
    }
  }

  // Login police user
  static async loginPolice(credentials: LoginCredentials): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // For police accounts created via admin dashboard, we need to check if the email exists in police database
      // and potentially create/update the police account record
      const policeRef = ref(database, 'police/police account');
      const snapshot = await get(policeRef);
      
      let policeAccountExists = false;
      let policeAccountData = null;
      
      if (snapshot.exists()) {
        const policeAccounts = snapshot.val();
        // Check if any police account has this email
        for (const [_uid, accountData] of Object.entries(policeAccounts)) {
          if ((accountData as any).email?.toLowerCase() === credentials.email.toLowerCase()) {
            policeAccountExists = true;
            policeAccountData = accountData as any;
            break;
          }
        }
      }
      
      if (!policeAccountExists) {
        // Sign out if not in police database
        await signOut(auth);
        throw new Error('Police account not found. Please contact your administrator.');
      }

      // If the police account exists but with a different UID (created via admin dashboard),
      // we need to update the record with the current auth UID
      if (policeAccountData && (policeAccountData as any).uid !== userCredential.user.uid) {
        console.log('Updating police account with new auth UID');
        const newPoliceRef = ref(database, `police/police account/${userCredential.user.uid}`);
        await set(newPoliceRef, {
          ...policeAccountData,
          uid: userCredential.user.uid,
          email: credentials.email,
          lastLogin: new Date().toISOString()
        });
        
        // Remove the old record if it exists
        if ((policeAccountData as any).uid) {
          const oldPoliceRef = ref(database, `police/police account/${(policeAccountData as any).uid}`);
          await set(oldPoliceRef, null);
        }
      } else if (policeAccountData && (policeAccountData as any).uid === userCredential.user.uid) {
        // Update last login time
        const userRef = ref(database, `police/police account/${userCredential.user.uid}`);
        await update(userRef, {
          lastLogin: new Date().toISOString()
        });
      }

      return userCredential;
    } catch (error) {
      console.error('Police login error:', error);
      throw error;
    }
  }

  // Check if civilian user is suspended
  static async checkUserSuspension(uid: string): Promise<boolean> {
    try {
      const userRef = ref(database, `civilian/civilian account/${uid}/isSuspended`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() === true;
      }
      
      return false; // Not suspended if field doesn't exist
    } catch (error) {
      console.error('Error checking suspension status:', error);
      return false;
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
        // Sign out if not in civilian database
        await signOut(auth);
        throw new Error('User not found in civilian database');
      }

      // Check if user is suspended
      const isSuspended = await this.checkUserSuspension(userCredential.user.uid);
      if (isSuspended) {
        // Sign out suspended user
        await signOut(auth);
        throw { 
          code: 'auth/account-suspended', 
          message: 'Your account has been suspended. Please contact support for more information.' 
        };
      }

      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get police user data
  static async getPoliceUser(uid: string): Promise<PoliceUser | null> {
    try {
      const userRef = ref(database, `police/police account/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as PoliceUser;
      }
      
      return null;
    } catch (error) {
      console.error('Get police user error:', error);
      return null;
    }
  }

  // Update police location
  static async updatePoliceLocation(uid: string, latitude: number, longitude: number): Promise<void> {
    try {
      const locationRef = ref(database, `police/police account/${uid}/currentLocation`);
      await set(locationRef, {
        latitude,
        longitude,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update police location error:', error);
      throw error;
    }
  }

  // Get all police locations
  static async getAllPoliceLocations(): Promise<PoliceUser[]> {
    try {
      const policeRef = ref(database, 'police/police account');
      const snapshot = await get(policeRef);
      
      if (snapshot.exists()) {
        const policeData = snapshot.val();
        const policeArray: PoliceUser[] = [];
        
        for (const uid in policeData) {
          const policeUser = policeData[uid];
          if (policeUser.currentLocation) {
            policeArray.push({
              uid,
              email: policeUser.email,
              badgeNumber: policeUser.badgeNumber,
              firstName: policeUser.firstName,
              lastName: policeUser.lastName,
              station: policeUser.station,
              currentLocation: policeUser.currentLocation,
            });
          }
        }
        
        return policeArray;
      }
      
      return [];
    } catch (error) {
      console.error('Get all police locations error:', error);
      return [];
    }
  }

  // Check if user exists in civilian database by email
  static async checkCivilianUser(email: string): Promise<boolean> {
    try {
      const usersRef = ref(database, 'civilian/civilian account');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        // Check if any user has this email
        for (const userId in users) {
          if (users[userId].email?.toLowerCase() === email.toLowerCase()) {
            return true; // Email already exists
          }
        }
      }
      return false; // Email is available
    } catch (error) {
      console.error('Check user error:', error);
      return false;
    }
  }

  // Check if phone number already exists
  static async checkPhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const phoneMappingRef = ref(database, `phone_mappings/${phoneNumber}`);
      const snapshot = await get(phoneMappingRef);
      return snapshot.exists(); // Returns true if phone number exists
    } catch (error) {
      console.error('Check phone number error:', error);
      return false;
    }
  }

  // Check if full name (first + last name) already exists
  static async checkFullNameExists(firstName: string, lastName: string): Promise<boolean> {
    try {
      const usersRef = ref(database, 'civilian/civilian account');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const searchFirstName = firstName.trim().toLowerCase();
        const searchLastName = lastName.trim().toLowerCase();
        
        // Check if any user has this exact first name AND last name combination
        for (const userId in users) {
          const user = users[userId];
          const userFirstName = user.firstName?.trim().toLowerCase();
          const userLastName = user.lastName?.trim().toLowerCase();
          
          if (userFirstName === searchFirstName && userLastName === searchLastName) {
            return true; // Full name combination already exists
          }
        }
      }
      return false; // Full name combination is available
    } catch (error) {
      console.error('Check full name error:', error);
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

  // Send email verification
  static async sendEmailVerification(user: User): Promise<void> {
    try {
      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }
      await sendEmailVerification(user);
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Check if user's email is verified
  static isEmailVerified(user: User): boolean {
    return user.emailVerified;
  }

  // Reload user data to get latest verification status
  static async reloadUser(user: User): Promise<void> {
    try {
      await user.reload();
    } catch (error) {
      console.error('Reload user error:', error);
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
        for (const [userId, _userData] of Object.entries(users)) {
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
        const report = snapshot.val();
        const crimeReport: CrimeReport = {
          crimeType: report.type || report.crimeType || 'Unknown',
          dateTime: report.dateTime ? new Date(report.dateTime) : (report.dateReported ? new Date(report.dateReported) : new Date()),
          description: report.description || '',
          multimedia: report.multimedia || [],
          location: {
            latitude: report.coordinates?.latitude || report.location?.latitude || 0,
            longitude: report.coordinates?.longitude || report.location?.longitude || 0,
            address: report.location?.address || (typeof report.location === 'string' ? report.location : 'Unknown location')
          },
          anonymous: report.anonymous || false,
          reporterName: report.reportedBy?.name || report.reporterName || 'Unknown',
          reporterUid: report.reportedBy?.uid || report.reporterUid || '',
          status: report.status || 'Unknown',
          createdAt: report.dateReported || report.createdAt || new Date().toISOString(),
          reportId: snapshot.key || undefined,
          severity: report.severity || 'Moderate',
          upvotes: report.upvotes || 0,
          downvotes: report.downvotes || 0,
          userVotes: report.userVotes || {},
          respondingOfficerId: report.respondingOfficerId,
          respondingOfficerName: report.respondingOfficerName,
          respondingOfficerBadgeNumber: report.respondingOfficerBadgeNumber
        };
        return crimeReport;
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

  // Assign responding officer to crime report
  static async assignRespondingOfficer(reportId: string, officerId: string): Promise<boolean> {
    try {
      console.log(`Assigning officer ${officerId} to report ${reportId}`);
      
      // Get police user data
      const policeUser = await this.getPoliceUser(officerId);
      if (!policeUser) {
        throw new Error('Police officer not found');
      }

      const officerName = policeUser.firstName && policeUser.lastName 
        ? `${policeUser.firstName} ${policeUser.lastName}` 
        : policeUser.badgeNumber 
          ? `Officer ${policeUser.badgeNumber}` 
          : 'Police Officer';

      // Update in main civilian crime reports collection
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const reportSnapshot = await get(reportRef);
      
      if (!reportSnapshot.exists()) {
        throw new Error('Report not found');
      }
      
      const report = reportSnapshot.val();
      
      // Check if another officer is already assigned
      if (report.respondingOfficerId && report.respondingOfficerId !== officerId) {
        throw new Error('Another officer is already assigned to this report');
      }
      
      await update(reportRef, {
        respondingOfficerId: officerId,
        respondingOfficerName: officerName,
        respondingOfficerBadgeNumber: policeUser.badgeNumber || '',
        status: 'in progress'
      });
      
      // Update in user's personal crime reports collection
      const userCrimeReportsRef = ref(database, `civilian/civilian account/${report.reporterUid}/crime reports/${reportId}`);
      await update(userCrimeReportsRef, {
        respondingOfficerId: officerId,
        respondingOfficerName: officerName,
        respondingOfficerBadgeNumber: policeUser.badgeNumber || '',
        status: 'in progress'
      });
      
      console.log(`Successfully assigned officer ${officerId} to report ${reportId}`);
      return true;
    } catch (error) {
      console.error('Error assigning responding officer:', error);
      throw error;
    }
  }

  // Remove responding officer from crime report
  static async removeRespondingOfficer(reportId: string, officerId: string): Promise<boolean> {
    try {
      console.log(`Removing officer ${officerId} from report ${reportId}`);
      
      // Update in main civilian crime reports collection
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const reportSnapshot = await get(reportRef);
      
      if (!reportSnapshot.exists()) {
        throw new Error('Report not found');
      }
      
      const report = reportSnapshot.val();
      
      // Check if this officer is actually assigned
      if (report.respondingOfficerId !== officerId) {
        throw new Error('You are not assigned to this report');
      }
      
      await update(reportRef, {
        respondingOfficerId: null,
        respondingOfficerName: null,
        respondingOfficerBadgeNumber: null,
        status: 'reported'
      });
      
      // Update in user's personal crime reports collection
      const userCrimeReportsRef = ref(database, `civilian/civilian account/${report.reporterUid}/crime reports/${reportId}`);
      await update(userCrimeReportsRef, {
        respondingOfficerId: null,
        respondingOfficerName: null,
        respondingOfficerBadgeNumber: null,
        status: 'reported'
      });
      
      console.log(`Successfully removed officer ${officerId} from report ${reportId}`);
      return true;
    } catch (error) {
      console.error('Error removing responding officer:', error);
      throw error;
    }
  }

  // Get assigned crime reports for a police officer
  static async getAssignedCrimeReports(officerId: string): Promise<CrimeReport[]> {
    try {
      console.log('Fetching assigned crime reports for officer:', officerId);
      
      // Get the officer's current assignment
      const officerRef = ref(database, `police/police account/${officerId}/currentAssignment`);
      const assignmentSnapshot = await get(officerRef);
      
      if (!assignmentSnapshot.exists()) {
        console.log('No current assignment found for officer');
        return [];
      }
      
      const assignment = assignmentSnapshot.val();
      const reportId = assignment.reportId;
      
      if (!reportId) {
        console.log('No reportId in current assignment');
        return [];
      }
      
      // Get the specific crime report
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      const reportSnapshot = await get(reportRef);
      
      if (!reportSnapshot.exists()) {
        console.log('Assigned report not found:', reportId);
        return [];
      }
      
      const report = reportSnapshot.val();
      const crimeReport: CrimeReport = {
        crimeType: report.type || report.crimeType || 'Unknown',
        dateTime: report.dateTime ? new Date(report.dateTime) : (report.dateReported ? new Date(report.dateReported) : new Date()),
        description: report.description || '',
        multimedia: report.multimedia || [],
        location: {
          latitude: report.coordinates?.latitude || report.location?.latitude || 0,
          longitude: report.coordinates?.longitude || report.location?.longitude || 0,
          address: typeof report.location === 'string' ? report.location : (report.location?.address || 'Unknown location')
        },
        anonymous: report.anonymous || false,
        reporterName: report.reportedBy?.name || report.reporterName || 'Unknown',
        reporterUid: report.reportedBy?.uid || report.reporterUid || '',
        status: report.status || 'Unknown',
        createdAt: report.dateReported || report.createdAt || new Date().toISOString(),
        reportId: reportSnapshot.key || undefined,
        severity: report.severity || 'Moderate',
        upvotes: report.upvotes || 0,
        downvotes: report.downvotes || 0,
        userVotes: report.userVotes || {},
        respondingOfficerId: report.respondingOfficerId,
        respondingOfficerName: report.respondingOfficerName,
        respondingOfficerBadgeNumber: report.respondingOfficerBadgeNumber
      };
      
      console.log('Found assigned report:', crimeReport);
      return [crimeReport];
    } catch (error) {
      console.error('Error fetching assigned crime reports:', error);
      throw error;
    }
  }

  // Resolve a case - update report status, clear assignment, set police to available
  static async resolveCase(reportId: string, policeId: string): Promise<void> {
    try {
      console.log('Resolving case:', reportId, 'for police:', policeId);
      
      // Update the crime report status to "Case Resolved"
      const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
      await update(reportRef, {
        status: 'Case Resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: policeId
      });
      
      // Clear the police officer's current assignment
      const policeAssignmentRef = ref(database, `police/police account/${policeId}/currentAssignment`);
      await set(policeAssignmentRef, null);
      
      // Set the police officer's status to Available
      const policeStatusRef = ref(database, `police/police account/${policeId}/status`);
      await set(policeStatusRef, 'Available');
      
      console.log('Case resolved successfully');
    } catch (error) {
      console.error('Error resolving case:', error);
      throw error;
    }
  }
}

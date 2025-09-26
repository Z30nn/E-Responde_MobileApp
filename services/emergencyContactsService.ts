import { ref, set, get, remove, push, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebaseConfig';
import { EmergencyContact, CreateEmergencyContactData, UpdateEmergencyContactData } from './types/emergency-types';
import { FirebaseService } from './firebaseService';

export class EmergencyContactsService {
  // Get all emergency contacts for a user
  static async getUserEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      console.log('EmergencyContactsService: Getting contacts for user:', userId);
      const contactsRef = ref(database, `emergency_contacts/${userId}`);
      console.log('EmergencyContactsService: Database reference created');
      const snapshot = await get(contactsRef);
      console.log('EmergencyContactsService: Snapshot received, exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const contacts: EmergencyContact[] = [];
        snapshot.forEach((childSnapshot) => {
          const contact = childSnapshot.val() as EmergencyContact;
          contacts.push({
            ...contact,
            id: childSnapshot.key || '',
          });
        });
        
        console.log('EmergencyContactsService: Processed contacts:', contacts.length);
        
        // Sort by primary first, then by creation date
        return contacts.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
      
      console.log('EmergencyContactsService: No contacts found, returning empty array');
      return [];
    } catch (error) {
      console.error('EmergencyContactsService: Error getting emergency contacts:', error);
      throw new Error(`Failed to load emergency contacts: ${error.message || 'Database error'}`);
    }
  }

  // Add a new emergency contact
  static async addEmergencyContact(userId: string, contactData: CreateEmergencyContactData): Promise<string> {
    try {
      const contactsRef = ref(database, `emergency_contacts/${userId}`);
      const newContactRef = push(contactsRef);
      
      const contact: EmergencyContact = {
        id: newContactRef.key || '',
        ...contactData,
        isPrimary: contactData.isPrimary || false,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await set(newContactRef, contact);

      // If this is set as primary, manage primary contacts (limit to 3)
      if (contactData.isPrimary) {
        await this.managePrimaryContacts(userId, newContactRef.key || '');
      }

      return newContactRef.key || '';
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    }
  }

  // Update an emergency contact
  static async updateEmergencyContact(
    userId: string, 
    contactId: string, 
    updateData: UpdateEmergencyContactData
  ): Promise<void> {
    try {
      const contactRef = ref(database, `emergency_contacts/${userId}/${contactId}`);
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await update(contactRef, updatePayload);

      // If this is set as primary, manage primary contacts (limit to 3)
      if (updateData.isPrimary) {
        await this.managePrimaryContacts(userId, contactId);
      }
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      throw error;
    }
  }

  // Delete an emergency contact
  static async deleteEmergencyContact(userId: string, contactId: string): Promise<void> {
    try {
      const contactRef = ref(database, `emergency_contacts/${userId}/${contactId}`);
      await remove(contactRef);
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  }

  // Get a specific emergency contact
  static async getEmergencyContact(userId: string, contactId: string): Promise<EmergencyContact | null> {
    try {
      const contactRef = ref(database, `emergency_contacts/${userId}/${contactId}`);
      const snapshot = await get(contactRef);
      
      if (snapshot.exists()) {
        return {
          ...snapshot.val(),
          id: contactId,
        } as EmergencyContact;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting emergency contact:', error);
      throw error;
    }
  }

  // Helper method to manage primary contacts (limit to 3)
  private static async managePrimaryContacts(userId: string, currentContactId: string): Promise<void> {
    try {
      const contactsRef = ref(database, `emergency_contacts/${userId}`);
      const snapshot = await get(contactsRef);
      
      if (snapshot.exists()) {
        const primaryContacts: { key: string; contact: EmergencyContact }[] = [];
        
        // Find all current primary contacts
        snapshot.forEach((childSnapshot) => {
          const contact = childSnapshot.val() as EmergencyContact;
          if (contact.isPrimary) {
            primaryContacts.push({
              key: childSnapshot.key || '',
              contact
            });
          }
        });
        
        // If we have more than 3 primary contacts, unset the oldest ones
        if (primaryContacts.length > 3) {
          // Sort by creation date (oldest first)
          primaryContacts.sort((a, b) => 
            new Date(a.contact.createdAt).getTime() - new Date(b.contact.createdAt).getTime()
          );
          
          const updates: { [key: string]: any } = {};
          // Keep the 3 most recent, unset the rest
          for (let i = 3; i < primaryContacts.length; i++) {
            const contactToUnset = primaryContacts[i];
            if (contactToUnset.key !== currentContactId) {
              updates[`${contactToUnset.key}/isPrimary`] = false;
              updates[`${contactToUnset.key}/updatedAt`] = new Date().toISOString();
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await update(contactsRef, updates);
            console.log('EmergencyContactsService: Unset excess primary contacts to maintain limit of 3');
          }
        }
      }
    } catch (error) {
      console.error('Error managing primary contacts:', error);
      throw error;
    }
  }

  // Get primary emergency contacts (up to 3)
  static async getPrimaryEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      const contacts = await this.getUserEmergencyContacts(userId);
      return contacts.filter(contact => contact.isPrimary);
    } catch (error) {
      console.error('Error getting primary emergency contacts:', error);
      throw error;
    }
  }

  // Get primary emergency contact (backward compatibility - returns first primary contact)
  static async getPrimaryEmergencyContact(userId: string): Promise<EmergencyContact | null> {
    try {
      const primaryContacts = await this.getPrimaryEmergencyContacts(userId);
      return primaryContacts.length > 0 ? primaryContacts[0] : null;
    } catch (error) {
      console.error('Error getting primary emergency contact:', error);
      throw error;
    }
  }

  // Find users who have the given user as a primary contact
  static async findUsersWithPrimaryContact(phoneNumber: string): Promise<string[]> {
    try {
      console.log('EmergencyContactsService: Finding users with primary contact:', phoneNumber);
      
      const emergencyContactsRef = ref(database, 'emergency_contacts');
      const snapshot = await get(emergencyContactsRef);
      
      const userIds: string[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((userSnapshot) => {
          const userId = userSnapshot.key;
          if (userId) {
            userSnapshot.forEach((contactSnapshot) => {
              const contact = contactSnapshot.val() as EmergencyContact;
              if (contact.isPrimary && contact.phoneNumber === phoneNumber) {
                console.log(`EmergencyContactsService: Found user ${userId} has ${phoneNumber} as primary contact`);
                userIds.push(userId);
              }
            });
          }
        });
      }
      
      console.log('EmergencyContactsService: Found users with primary contact:', userIds.length);
      return userIds;
    } catch (error) {
      console.error('EmergencyContactsService: Error finding users with primary contact:', error);
      return [];
    }
  }

  // Send SOS alert to emergency contacts
  static async sendSOSAlert(userId: string, message?: string): Promise<{ success: boolean; sentTo: number; errors: string[] }> {
    try {
      console.log('EmergencyContactsService: Sending SOS alert for user:', userId);
      console.log('EmergencyContactsService: Message:', message);
      
      // Get user's primary emergency contacts
      const primaryContacts = await this.getPrimaryEmergencyContacts(userId);
      console.log('EmergencyContactsService: Primary contacts:', primaryContacts.length);
      
      if (primaryContacts.length === 0) {
        console.log('EmergencyContactsService: No primary contacts found');
        throw new Error('No primary emergency contacts found');
      }

      // Get user info for the alert
      const { auth } = require('../firebaseConfig');
      const currentUser = auth.currentUser;
      console.log('EmergencyContactsService: Current user:', currentUser?.uid);
      if (!currentUser) {
        console.log('EmergencyContactsService: No authenticated user');
        throw new Error('User not authenticated');
      }

      // Get user profile data
      let userName = 'Unknown User';
      let userData = null;
      try {
        userData = await FirebaseService.getCivilianUser(currentUser.uid);
        console.log('EmergencyContactsService: User data:', userData);
        if (userData) {
          userName = `${userData.firstName} ${userData.lastName}`;
        }
      } catch (error) {
        console.log('EmergencyContactsService: Could not fetch user profile for SOS alert:', error);
      }
      
      console.log('EmergencyContactsService: userData after fetch:', userData);
      console.log('EmergencyContactsService: userData type:', typeof userData);

      const sosMessage = message || ``;
      const alertTitle = 'SOS ALERT';
      const alertBody = sosMessage;

      // Get user's current location (if available)
      let userLocation = null;
      try {
        // This would typically use a location service
        // For now, we'll add a placeholder that can be enhanced later
        userLocation = {
          latitude: 0, // Will be replaced with actual location
          longitude: 0, // Will be replaced with actual location
          address: 'Location not available' // Will be replaced with actual address
        };
      } catch (error) {
        console.log('Could not get user location for SOS alert');
      }

      let sentCount = 0;
      const errors: string[] = [];

      // Send notification to each primary contact
      for (const contact of primaryContacts) {
        try {
          console.log(`EmergencyContactsService: Processing contact: ${contact.name} (${contact.phoneNumber})`);
          
          // Find the contact's user ID by phone number
          const contactUser = await FirebaseService.getUserByPhoneNumber(contact.phoneNumber);
          console.log(`EmergencyContactsService: Contact user lookup result:`, contactUser);
          
          if (contactUser) {
            console.log(`EmergencyContactsService: Sending notification to user: ${contactUser.userId}`);
            
            // Send notification to the contact through the app
            console.log('EmergencyContactsService: About to send notification, userData:', userData);
            console.log('EmergencyContactsService: userData?.contactNumber:', userData?.contactNumber);
            
            const notificationService = new (require('./notificationService').NotificationService)();
            await notificationService.sendNotification(
              contactUser.userId,
              'sos_alert',
              alertTitle,
              alertBody,
              {
                fromUserId: userId,
                fromUserName: userName,
                fromUserPhone: userData?.contactNumber || 'Not available',
                contactId: contact.id,
                contactName: contact.name,
                contactPhone: contact.phoneNumber,
                timestamp: new Date().toISOString(),
                isTest: false,
                location: userLocation
              }
            );
            
            sentCount++;
            console.log(`EmergencyContactsService: SOS alert sent to contact: ${contact.name} (${contactUser.firstName} ${contactUser.lastName})`);
          } else {
            // Contact is not registered in the app, but we can still log it
            console.log(`EmergencyContactsService: Contact ${contact.name} (${contact.phoneNumber}) is not registered in the app`);
            errors.push(`${contact.name} is not registered in the app`);
          }
        } catch (error) {
          console.error(`EmergencyContactsService: Error sending SOS to ${contact.name}:`, error);
          errors.push(`Failed to send to ${contact.name}: ${error.message}`);
        }
      }

      // Also send a confirmation notification to the user who sent the SOS
      console.log('EmergencyContactsService: Sending confirmation notification to sender:', userId);
      console.log('EmergencyContactsService: Sender name:', userName);
      console.log('EmergencyContactsService: userData for confirmation:', userData);
      console.log('EmergencyContactsService: Sender phone:', userData?.contactNumber);
      
      const notificationService = new (require('./notificationService').NotificationService)();
      const confirmationResult = await notificationService.sendNotification(
        userId,
        'sos_alert',
        'SOS Alert Sent',
        `Your SOS alert has been sent to ${sentCount} emergency contact(s).`,
        {
          fromUserId: userId,
          fromUserName: userName,
          fromUserPhone: userData?.contactNumber || 'Not available',
          sentTo: sentCount,
          contactIds: primaryContacts.map(c => c.id),
          timestamp: new Date().toISOString(),
          isTest: false,
          location: userLocation
        }
      );
      
      console.log('EmergencyContactsService: Confirmation notification result:', confirmationResult);

      // Also send notifications to users who have this user as a primary contact
      if (userData?.contactNumber) {
        console.log('EmergencyContactsService: Finding users who have this user as primary contact...');
        const usersWithPrimaryContact = await this.findUsersWithPrimaryContact(userData.contactNumber);
        
        if (usersWithPrimaryContact.length > 0) {
          console.log(`EmergencyContactsService: Found ${usersWithPrimaryContact.length} users with this user as primary contact`);
          
          for (const targetUserId of usersWithPrimaryContact) {
            try {
              // Skip if this is the same user (avoid self-notification)
              if (targetUserId === userId) {
                continue;
              }
              
              console.log(`EmergencyContactsService: Sending SOS notification to user who has sender as primary contact: ${targetUserId}`);
              
              await notificationService.sendNotification(
                targetUserId,
                'sos_alert',
                alertTitle,
                alertBody,
                {
                  fromUserId: userId,
                  fromUserName: userName,
                  fromUserPhone: userData.contactNumber,
                  contactId: 'primary_contact_reverse',
                  contactName: userName,
                  contactPhone: userData.contactNumber,
                  timestamp: new Date().toISOString(),
                  isTest: false,
                  location: userLocation,
                  isReverseNotification: true // Flag to indicate this is a reverse notification
                }
              );
              
              sentCount++;
              console.log(`EmergencyContactsService: SOS alert sent to user who has sender as primary contact: ${targetUserId}`);
            } catch (error) {
              console.error(`EmergencyContactsService: Error sending reverse SOS notification to ${targetUserId}:`, error);
              errors.push(`Failed to notify user who has you as primary contact: ${error.message}`);
            }
          }
        } else {
          console.log('EmergencyContactsService: No users found with this user as primary contact');
        }
      } else {
        console.log('EmergencyContactsService: No contact number available for reverse notifications');
      }

      return {
        success: sentCount > 0,
        sentTo: sentCount,
        errors
      };
    } catch (error) {
      console.error('Error sending SOS alert:', error);
      throw new Error(`Failed to send SOS alert: ${error.message}`);
    }
  }

}

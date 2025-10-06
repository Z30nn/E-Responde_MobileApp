import { ref, set, get, remove, push, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebaseConfig';
import { EmergencyContact, CreateEmergencyContactData, UpdateEmergencyContactData } from './types/emergency-types';
import { FirebaseService } from './firebaseService';
import Geolocation from '@react-native-community/geolocation';

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
      
      // No need to check for registered users or pending requests - just add directly
      
      // Create new contact directly
      const contact: EmergencyContact = {
        id: newContactRef.key || '',
        ...contactData,
        isPrimary: contactData.isPrimary, // Set as primary if requested
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await set(newContactRef, contact);

      // If this is set as primary, manage primary contacts (limit to 3)
      if (contactData.isPrimary) {
        await this.managePrimaryContacts(userId, contact.id);
      }

      return contact.id;
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
      const primaryContacts = contacts.filter(contact => contact.isPrimary === true);
      console.log(`EmergencyContactsService: Found ${primaryContacts.length} primary contacts out of ${contacts.length} total contacts`);
      return primaryContacts;
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

  // Check if a phone number is registered in the app and send notification
  static async checkAndNotifyRegisteredContact(requesterUserId: string, phoneNumber: string, contactName: string, contactId: string): Promise<void> {
    try {
      console.log('EmergencyContactsService: Checking if phone number is registered:', phoneNumber);
      
      // Look for users with this phone number in the civilian accounts
      const usersRef = ref(database, 'civilian/civilian account');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        let registeredUserId = null;
        let registeredUserName = '';
        
        // Find the user with matching phone number
        for (const [userId, userData] of Object.entries(users)) {
          if (userData.contactNumber === phoneNumber) {
            registeredUserId = userId;
            registeredUserName = `${userData.firstName} ${userData.lastName}`;
            break;
          }
        }
        
        if (registeredUserId && registeredUserId !== requesterUserId) {
          console.log('EmergencyContactsService: Found registered user:', registeredUserName);
          
          // Get requester's name
          let requesterName = 'Someone';
          try {
            const requesterData = await FirebaseService.getCivilianUser(requesterUserId);
            if (requesterData) {
              requesterName = `${requesterData.firstName} ${requesterData.lastName}`;
            }
          } catch (error) {
            console.log('EmergencyContactsService: Could not get requester name:', error);
          }
          
          // Send notification to the registered user
          try {
            console.log('EmergencyContactsService: Attempting to send notification to:', registeredUserId);
            const notificationService = new (require('./notificationService').NotificationService)();
            
            const notificationResult = await notificationService.sendNotification(
              registeredUserId,
              'primary_contact_request',
              'Primary Contact Request',
              `${requesterName} wants to add you as their primary emergency contact. Do you want to accept or decline?`,
              {
                requesterUserId,
                requesterName,
                contactName,
                phoneNumber,
                contactId,
                requestId: Date.now().toString(),
                type: 'primary_contact_request'
              }
            );
            
            console.log('EmergencyContactsService: Notification service result:', notificationResult);
            console.log('EmergencyContactsService: Primary contact request notification sent to:', registeredUserName);
          } catch (notificationError) {
            console.error('EmergencyContactsService: Error sending primary contact request notification:', notificationError);
            // Don't throw error to avoid breaking the contact addition
          }
        } else {
          console.log('EmergencyContactsService: Phone number not registered or same user');
        }
      }
    } catch (error) {
      console.error('EmergencyContactsService: Error checking registered contact:', error);
      // Don't throw error to avoid breaking the contact addition
    }
  }

  // Accept a primary contact request
  static async acceptPrimaryContactRequest(requesterUserId: string, contactId: string, accepterUserId: string): Promise<boolean> {
    try {
      console.log('EmergencyContactsService: Accepting primary contact request:', { requesterUserId, contactId, accepterUserId });
      
      // Validate inputs
      if (!requesterUserId || !contactId || !accepterUserId) {
        console.error('EmergencyContactsService: Missing required parameters:', { requesterUserId, contactId, accepterUserId });
        return false;
      }
      
      // Get the contact details from the requester's emergency contacts
      const contactRef = ref(database, `emergency_contacts/${requesterUserId}/${contactId}`);
      const contactSnapshot = await get(contactRef);
      
      if (!contactSnapshot.exists()) {
        console.error('EmergencyContactsService: Contact not found:', { contactId, requesterUserId });
        return false;
      }
      
      const contactData = contactSnapshot.val();
      console.log('EmergencyContactsService: Found contact data:', contactData);
      
      // Get the accepter's user data to add them to the requester's contact list
      const accepterRef = ref(database, `civilian/civilian account/${accepterUserId}`);
      const accepterSnapshot = await get(accepterRef);
      
      if (!accepterSnapshot.exists()) {
        console.error('EmergencyContactsService: Accepter user not found:', accepterUserId);
        return false;
      }
      
      const accepterData = accepterSnapshot.val();
      console.log('EmergencyContactsService: Found accepter data:', accepterData);
      
      // Create a new contact with the accepter's information and make it active primary
      const newContactRef = ref(database, `emergency_contacts/${requesterUserId}`);
      const newContact = push(newContactRef);
      
      const updatedContact = {
        id: newContact.key || '',
        ...contactData,
        isPrimary: true, // Now it's an active primary contact
        isPendingPrimary: false, // No longer pending
        accepted: true,
        acceptedAt: new Date().toISOString(),
        acceptedBy: accepterUserId,
        accepterName: `${accepterData.firstName} ${accepterData.lastName}`,
        accepterPhone: accepterData.contactNumber,
        updatedAt: new Date().toISOString(),
      };
      
      // Create new contact and delete old one
      await set(newContact, updatedContact);
      await remove(contactRef);
      
      const newContactId = newContact.key || '';
      
      // Manage primary contacts to ensure limit is respected
      await this.managePrimaryContacts(requesterUserId, newContactId);
      
      // Send confirmation notification to the requester
      try {
        const notificationService = new (require('./notificationService').NotificationService)();
        await notificationService.sendNotification(
          requesterUserId,
          'primary_contact_added',
          'Primary Contact Request Accepted',
          `${accepterData.firstName} ${accepterData.lastName} has accepted your primary contact request.`,
          {
            contactId: newContactId,
            accepterUserId,
            accepterName: `${accepterData.firstName} ${accepterData.lastName}`,
            accepterPhone: accepterData.contactNumber,
            type: 'primary_contact_added'
          }
        );
        console.log('EmergencyContactsService: Notification sent successfully');
      } catch (notificationError) {
        console.error('EmergencyContactsService: Error sending notification:', notificationError);
        // Don't fail the whole operation if notification fails
      }
      
      console.log('EmergencyContactsService: Primary contact request accepted successfully');
      return true;
      
    } catch (error) {
      console.error('EmergencyContactsService: Error accepting primary contact request:', error);
      return false;
    }
  }

  // Decline a primary contact request
  static async declinePrimaryContactRequest(requesterUserId: string, contactId: string, declinerUserId: string): Promise<boolean> {
    try {
      console.log('EmergencyContactsService: Declining primary contact request:', { requesterUserId, contactId, declinerUserId });
      
      // Get the contact details first
      const contactRef = ref(database, `emergency_contacts/${requesterUserId}/${contactId}`);
      const contactSnapshot = await get(contactRef);
      
      if (!contactSnapshot.exists()) {
        console.error('EmergencyContactsService: Contact not found for decline:', contactId);
        return false;
      }
      
      const contactData = contactSnapshot.val();
      
      // Instead of removing, mark as declined but keep the contact for future requests
      const declinedContact = {
        ...contactData,
        isPrimary: false,
        isPendingPrimary: false,
        isDeclined: true,
        declinedAt: new Date().toISOString(),
        declinedBy: declinerUserId,
        updatedAt: new Date().toISOString(),
      };
      
      // Update the contact with declined status
      await set(contactRef, declinedContact);
      
      // Get the decliner's user data for the notification
      const declinerRef = ref(database, `civilian/civilian account/${declinerUserId}`);
      const declinerSnapshot = await get(declinerRef);
      
      if (declinerSnapshot.exists()) {
        const declinerData = declinerSnapshot.val();
        
        // Send notification to the requester about the decline
        const notificationService = new (require('./notificationService').NotificationService)();
        await notificationService.sendNotification(
          requesterUserId,
          'primary_contact_declined',
          'Primary Contact Request Declined',
          `${declinerData.firstName} ${declinerData.lastName} has declined your primary contact request.`,
          {
            contactId,
            declinerUserId,
            declinerName: `${declinerData.firstName} ${declinerData.lastName}`,
            type: 'primary_contact_declined'
          }
        );
      }
      
      console.log('EmergencyContactsService: Primary contact request declined successfully');
      return true;
      
    } catch (error) {
      console.error('EmergencyContactsService: Error declining primary contact request:', error);
      return false;
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
        // Get current position with timeout (same approach as working crime reports)
        const locationPromise = new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Use reverse geocoding to get address (same as working crime reports)
              let address = 'Location not available';
              try {
                console.log('EmergencyContactsService: Starting reverse geocoding...');
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                  {
                    headers: {
                      'User-Agent': 'E-Responde-MobileApp/1.0',
                      'Accept': 'application/json',
                    },
                  }
                );
                
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('EmergencyContactsService: Geocoding response:', data);
                if (data && data.display_name) {
                  address = data.display_name;
                  console.log('EmergencyContactsService: Address found:', address);
                } else {
                  // Fallback to coordinates if no address found
                  address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                  console.log('EmergencyContactsService: Using coordinate fallback:', address);
                }
              } catch (geocodeError) {
                console.log('EmergencyContactsService: Reverse geocoding failed:', geocodeError);
                // Fallback to coordinates on error
                address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                console.log('EmergencyContactsService: Using coordinate fallback after error:', address);
              }
              
              resolve({
                latitude,
                longitude,
                address
              });
            },
            (error) => {
              console.log('Location error:', error);
              reject(error);
            },
                   {
                     enableHighAccuracy: false, // Same as working crime reports
                     timeout: 10000, // Same as working crime reports
                     maximumAge: 30000 // Same as working crime reports
                   }
          );
        });
        
        // Wait for location with same timeout as working crime reports
        userLocation = await Promise.race([
          locationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          )
        ]);
        
        console.log('SOS Alert: Location captured:', userLocation);
        console.log('SOS Alert: Location details - Lat:', userLocation.latitude, 'Lng:', userLocation.longitude, 'Address:', userLocation.address);
        
        // Debug: Check if location is valid
        if (userLocation.latitude === 0 && userLocation.longitude === 0) {
          console.log('SOS Alert: WARNING - Location is still 0,0 - this indicates a problem');
        }
      } catch (error) {
        console.log('Could not get user location for SOS alert:', error);
        console.log('SOS Alert: Location error details:', error.message);
        
        // Fallback to default location
        userLocation = {
          latitude: 0,
          longitude: 0,
          address: 'Location not available'
        };
        
        console.log('SOS Alert: Using fallback location:', userLocation);
      }

      let sentToPrimaryContacts = 0;
      let sentToReverseContacts = 0;
      const errors: string[] = [];

      // Send notification to each primary contact
      for (const contact of primaryContacts) {
        try {
          // Verify this is a primary contact
          if (!contact.isPrimary) {
            console.log(`EmergencyContactsService: Skipping non-primary contact: ${contact.name} (${contact.phoneNumber})`);
            continue;
          }
          
          console.log(`EmergencyContactsService: Processing PRIMARY contact: ${contact.name} (${contact.phoneNumber})`);
          
          // Find the contact's user ID by phone number
          const contactUser = await FirebaseService.getUserByPhoneNumber(contact.phoneNumber);
          console.log(`EmergencyContactsService: Contact user lookup result:`, contactUser);
          
          if (contactUser) {
            console.log(`EmergencyContactsService: Sending notification to user: ${contactUser.userId}`);
            
            // Send notification to the contact through the app
            console.log('EmergencyContactsService: About to send notification, userData:', userData);
            console.log('EmergencyContactsService: userData?.contactNumber:', userData?.contactNumber);
            
            const notificationService = new (require('./notificationService').NotificationService)();
            
            const notificationData = {
              fromUserId: userId,
              fromUserName: userName,
              fromUserPhone: userData?.contactNumber || 'Not available',
              contactId: contact.id,
              contactName: contact.name,
              contactPhone: contact.phoneNumber,
              timestamp: new Date().toISOString(),
              isTest: false,
              location: userLocation
            };
            
            console.log('SOS Alert: Sending notification with data:', notificationData);
            console.log('SOS Alert: Location in notification:', notificationData.location);
            
            // Debug: Check if location is being sent
            if (notificationData.location.latitude === 0 && notificationData.location.longitude === 0) {
              console.log('SOS Alert: ERROR - Location is 0,0 in notification data!');
            } else {
              console.log('SOS Alert: SUCCESS - Valid location being sent:', notificationData.location);
            }
            
            await notificationService.sendNotification(
              contactUser.userId,
              'sos_alert',
              alertTitle,
              alertBody,
              notificationData
            );
            
            sentToPrimaryContacts++;
            console.log(`EmergencyContactsService: SOS alert sent to PRIMARY contact: ${contact.name} (${contactUser.firstName} ${contactUser.lastName})`);
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
        `Your SOS alert has been sent to ${sentToPrimaryContacts} emergency contact(s).`,
        {
          fromUserId: userId,
          fromUserName: userName,
          fromUserPhone: userData?.contactNumber || 'Not available',
          sentTo: sentToPrimaryContacts,
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
              
              sentToReverseContacts++;
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
        success: sentToPrimaryContacts > 0,
        sentTo: sentToPrimaryContacts,
        errors
      };
    } catch (error) {
      console.error('Error sending SOS alert:', error);
      throw new Error(`Failed to send SOS alert: ${error.message}`);
    }
  }

}

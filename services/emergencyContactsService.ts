import { ref, set, get, remove, push, update } from 'firebase/database';
import { database } from '../firebaseConfig';
import { EmergencyContact, CreateEmergencyContactData, UpdateEmergencyContactData } from './types/emergency-types';

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

      // If this is set as primary, unset other primary contacts
      if (contactData.isPrimary) {
        await this.unsetOtherPrimaryContacts(userId, newContactRef.key || '');
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

      // If this is set as primary, unset other primary contacts
      if (updateData.isPrimary) {
        await this.unsetOtherPrimaryContacts(userId, contactId);
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

  // Helper method to unset other primary contacts
  private static async unsetOtherPrimaryContacts(userId: string, currentContactId: string): Promise<void> {
    try {
      const contactsRef = ref(database, `emergency_contacts/${userId}`);
      const snapshot = await get(contactsRef);
      
      if (snapshot.exists()) {
        const updates: { [key: string]: any } = {};
        
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.key !== currentContactId) {
            const contact = childSnapshot.val() as EmergencyContact;
            if (contact.isPrimary) {
              updates[`${childSnapshot.key}/isPrimary`] = false;
              updates[`${childSnapshot.key}/updatedAt`] = new Date().toISOString();
            }
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(contactsRef, updates);
        }
      }
    } catch (error) {
      console.error('Error unsetting other primary contacts:', error);
      throw error;
    }
  }

  // Get primary emergency contact
  static async getPrimaryEmergencyContact(userId: string): Promise<EmergencyContact | null> {
    try {
      const contacts = await this.getUserEmergencyContacts(userId);
      return contacts.find(contact => contact.isPrimary) || null;
    } catch (error) {
      console.error('Error getting primary emergency contact:', error);
      throw error;
    }
  }
}

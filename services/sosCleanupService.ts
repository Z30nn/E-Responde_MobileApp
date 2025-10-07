import { ref, get, remove } from 'firebase/database';
import { database } from '../firebaseConfig';

export interface CleanupResult {
  totalProcessed: number;
  totalDeleted: number;
  errors: string[];
}

export class SOSCleanupService {
  private static instance: SOSCleanupService;

  public static getInstance(): SOSCleanupService {
    if (!SOSCleanupService.instance) {
      SOSCleanupService.instance = new SOSCleanupService();
    }
    return SOSCleanupService.instance;
  }

  /**
   * Clean up SOS alerts older than 1 week for a specific user
   */
  async cleanupUserSOSAlerts(userId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    try {
      console.log(`SOSCleanupService: Starting cleanup for user ${userId}`);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoISO = oneWeekAgo.toISOString();

      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      if (!snapshot.exists()) {
        console.log(`SOSCleanupService: No notifications found for user ${userId}`);
        return { deleted: 0, errors: [] };
      }

      const alertsToDelete: string[] = [];
      const errors: string[] = [];

      // Find SOS alerts older than 1 week
      snapshot.forEach((childSnapshot) => {
        const notification = childSnapshot.val();
        
        if (notification.type === 'sos_alert') {
          const alertTimestamp = new Date(notification.timestamp);
          if (alertTimestamp < oneWeekAgo) {
            alertsToDelete.push(childSnapshot.key || '');
            console.log(`SOSCleanupService: Found old SOS alert from ${notification.timestamp}`);
          }
        }
      });

      // Delete old alerts
      let deletedCount = 0;
      for (const alertId of alertsToDelete) {
        try {
          const alertRef = ref(database, `civilian/civilian account/${userId}/notifications/${alertId}`);
          await remove(alertRef);
          deletedCount++;
          console.log(`SOSCleanupService: Deleted old SOS alert ${alertId}`);
        } catch (error) {
          const errorMsg = `Failed to delete alert ${alertId}: ${error.message}`;
          console.error(`SOSCleanupService: ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`SOSCleanupService: Cleanup completed for user ${userId}. Deleted: ${deletedCount}`);
      return { deleted: deletedCount, errors };
    } catch (error) {
      console.error(`SOSCleanupService: Error cleaning up user ${userId}:`, error);
      return { deleted: 0, errors: [error.message] };
    }
  }

  /**
   * Get statistics about SOS alerts for a user
   */
  async getUserSOSStats(userId: string): Promise<{
    total: number;
    olderThanWeek: number;
    newerThanWeek: number;
    oldestAlert?: string;
    newestAlert?: string;
  }> {
    try {
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      if (!snapshot.exists()) {
        return { total: 0, olderThanWeek: 0, newerThanWeek: 0 };
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let total = 0;
      let olderThanWeek = 0;
      let newerThanWeek = 0;
      let oldestAlert: string | undefined;
      let newestAlert: string | undefined;

      snapshot.forEach((childSnapshot) => {
        const notification = childSnapshot.val();
        
        if (notification.type === 'sos_alert') {
          total++;
          const alertTimestamp = new Date(notification.timestamp);
          
          if (alertTimestamp < oneWeekAgo) {
            olderThanWeek++;
          } else {
            newerThanWeek++;
          }

          // Track oldest and newest
          if (!oldestAlert || alertTimestamp < new Date(oldestAlert)) {
            oldestAlert = notification.timestamp;
          }
          if (!newestAlert || alertTimestamp > new Date(newestAlert)) {
            newestAlert = notification.timestamp;
          }
        }
      });

      return {
        total,
        olderThanWeek,
        newerThanWeek,
        oldestAlert,
        newestAlert
      };
    } catch (error) {
      console.error(`SOSCleanupService: Error getting stats for user ${userId}:`, error);
      return { total: 0, olderThanWeek: 0, newerThanWeek: 0 };
    }
  }
}

export const sosCleanupService = SOSCleanupService.getInstance();
export default sosCleanupService;

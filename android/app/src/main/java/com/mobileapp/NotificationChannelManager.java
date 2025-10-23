package com.mobileapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/**
 * Notification Channel Manager for E-Responde
 * 
 * This class creates and manages notification channels for the E-Responde app.
 * It ensures that both regular notifications and SOS alerts have proper channels.
 */
public class NotificationChannelManager {
    
    // Channel IDs
    public static final String DEFAULT_CHANNEL_ID = "e-responde-notifications";
    public static final String SOS_CHANNEL_ID = "e-responde-sos";
    
    // Channel Names
    public static final String DEFAULT_CHANNEL_NAME = "E-Responde Notifications";
    public static final String SOS_CHANNEL_NAME = "SOS Emergency Alerts";
    
    // Channel Descriptions
    public static final String DEFAULT_CHANNEL_DESCRIPTION = "General notifications from E-Responde app";
    public static final String SOS_CHANNEL_DESCRIPTION = "Emergency SOS alerts and critical notifications";
    
    /**
     * Create all notification channels for the app
     * This should be called when the app starts
     */
    public static void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager == null) {
                return;
            }
            
            // Create default notification channel
            NotificationChannel defaultChannel = new NotificationChannel(
                DEFAULT_CHANNEL_ID,
                DEFAULT_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription(DEFAULT_CHANNEL_DESCRIPTION);
            defaultChannel.enableLights(true);
            defaultChannel.setLightColor(0xFF6B35); // Orange color
            defaultChannel.enableVibration(true);
            defaultChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            defaultChannel.setShowBadge(true);
            defaultChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            
            // Create SOS notification channel
            NotificationChannel sosChannel = new NotificationChannel(
                SOS_CHANNEL_ID,
                SOS_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            sosChannel.setDescription(SOS_CHANNEL_DESCRIPTION);
            sosChannel.enableLights(true);
            sosChannel.setLightColor(0xFF0000); // Red color for emergency
            sosChannel.enableVibration(true);
            sosChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            sosChannel.setShowBadge(true);
            sosChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            sosChannel.setBypassDnd(true); // Bypass Do Not Disturb for SOS
            
            // Create the channels
            notificationManager.createNotificationChannel(defaultChannel);
            notificationManager.createNotificationChannel(sosChannel);
            
            // Log channel creation
            System.out.println("NotificationChannelManager: Created notification channels");
            System.out.println("NotificationChannelManager: - " + DEFAULT_CHANNEL_NAME + " (ID: " + DEFAULT_CHANNEL_ID + ")");
            System.out.println("NotificationChannelManager: - " + SOS_CHANNEL_NAME + " (ID: " + SOS_CHANNEL_ID + ")");
        }
    }
    
    /**
     * Check if notification channels exist
     */
    public static boolean checkNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager == null) {
                return false;
            }
            
            // Check if both channels exist
            boolean defaultChannelExists = notificationManager.getNotificationChannel(DEFAULT_CHANNEL_ID) != null;
            boolean sosChannelExists = notificationManager.getNotificationChannel(SOS_CHANNEL_ID) != null;
            
            System.out.println("NotificationChannelManager: Default channel exists: " + defaultChannelExists);
            System.out.println("NotificationChannelManager: SOS channel exists: " + sosChannelExists);
            
            return defaultChannelExists && sosChannelExists;
        }
        
        return true; // For older Android versions, channels are not required
    }
}

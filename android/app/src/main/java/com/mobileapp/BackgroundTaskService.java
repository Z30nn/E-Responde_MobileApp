package com.mobileapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Background Task Service for E-Responde Mobile App
 * 
 * This service runs continuously in the background to:
 * 1. Monitor for SOS alerts via gyroscope
 * 2. Handle FCM notifications when app is killed
 * 3. Maintain emergency response capabilities
 */
public class BackgroundTaskService extends Service {
    private static final String TAG = "BackgroundTaskService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "background_task_service";
    private static final String CHANNEL_NAME = "Background Task Service";
    
    private PowerManager.WakeLock wakeLock;
    private boolean isServiceRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Background Task Service created");
        
        // Create notification channel
        createNotificationChannel();
        
        // Acquire wake lock to prevent CPU sleep
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "E-Responde::BackgroundTaskService"
            );
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Background Task Service started");
        
        if (!isServiceRunning) {
            // Start as foreground service to prevent being killed
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Acquire wake lock
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire();
            }
            
            isServiceRunning = true;
            
            // Start background monitoring
            startBackgroundMonitoring();
        }
        
        // Return START_STICKY to restart if killed
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Background Task Service destroyed");
        
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        isServiceRunning = false;
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Continuous background monitoring for emergency alerts");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableLights(false);
            channel.enableVibration(false);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, 
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("E-Responde")
            .setContentText("Emergency monitoring is active")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setSound(null)
            .setVibrate(null)
            .build();
    }

    private void startBackgroundMonitoring() {
        Log.d(TAG, "Starting background monitoring...");
        
        // This service runs continuously to:
        // 1. Monitor for SOS alerts
        // 2. Handle FCM notifications
        // 3. Maintain emergency response capabilities
        
        // The actual monitoring is handled by React Native components
        // This service just keeps the app alive in the background
    }
}

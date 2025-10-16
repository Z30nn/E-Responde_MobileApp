package com.mobileapp;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

/**
 * Patch for InCallManager to handle Android 13+ broadcast receiver requirements
 */
public class InCallManagerPatch {
    private static final String TAG = "InCallManagerPatch";
    
    /**
     * Safely register a broadcast receiver with proper flags for Android 13+
     */
    public static void registerReceiverSafely(Context context, android.content.BroadcastReceiver receiver, IntentFilter filter) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ requires explicit export flags
                context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
                Log.d(TAG, "Registered receiver with RECEIVER_NOT_EXPORTED flag");
            } else {
                // For older Android versions, use the standard method
                context.registerReceiver(receiver, filter);
                Log.d(TAG, "Registered receiver with standard method");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to register receiver: " + e.getMessage());
        }
    }
    
    /**
     * Safely unregister a broadcast receiver
     */
    public static void unregisterReceiverSafely(Context context, android.content.BroadcastReceiver receiver) {
        try {
            context.unregisterReceiver(receiver);
            Log.d(TAG, "Successfully unregistered receiver");
        } catch (Exception e) {
            Log.e(TAG, "Failed to unregister receiver: " + e.getMessage());
        }
    }
}

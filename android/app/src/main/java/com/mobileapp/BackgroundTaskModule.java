package com.mobileapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.content.Intent;
import android.util.Log;

/**
 * React Native module to control the background task service
 */
public class BackgroundTaskModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BackgroundTaskModule";
    private ReactApplicationContext reactContext;

    public BackgroundTaskModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BackgroundTaskModule";
    }

    @ReactMethod
    public void startBackgroundService(Promise promise) {
        try {
            Log.d(TAG, "Starting background service...");
            
            Intent serviceIntent = new Intent(reactContext, BackgroundTaskService.class);
            reactContext.startForegroundService(serviceIntent);
            
            Log.d(TAG, "Background service started successfully");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error starting background service:", e);
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopBackgroundService(Promise promise) {
        try {
            Log.d(TAG, "Stopping background service...");
            
            Intent serviceIntent = new Intent(reactContext, BackgroundTaskService.class);
            reactContext.stopService(serviceIntent);
            
            Log.d(TAG, "Background service stopped successfully");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping background service:", e);
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }
}

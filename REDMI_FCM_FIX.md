# Redmi/Xiaomi FCM Fix Guide

## For Redmi/Xiaomi Devices (MIUI)

Redmi devices have very aggressive battery optimization that blocks FCM notifications when the app is killed. Here are the exact steps to fix it:

### Step 1: Disable Battery Optimization
1. **Go to Settings > Apps > E-Responde**
2. **Tap "Battery saver"**
3. **Select "No restrictions"** (or "Don't optimize")
4. **Go back to app settings**

### Step 2: Enable Autostart
1. **Go to Settings > Apps > E-Responde**
2. **Tap "Autostart"**
3. **Enable "Autostart"** for E-Responde
4. **This allows the app to start automatically**

### Step 3: Disable MIUI Battery Optimization
1. **Go to Settings > Battery & performance**
2. **Tap "App battery saver"**
3. **Find "E-Responde"**
4. **Select "No restrictions"**
5. **Enable "Background activity"**

### Step 4: Disable MIUI Security App Restrictions
1. **Open "Security" app**
2. **Tap "Battery"**
3. **Tap "App battery saver"**
4. **Find "E-Responde"**
5. **Select "No restrictions"**

### Step 5: Enable Notifications
1. **Go to Settings > Apps > E-Responde**
2. **Tap "Notifications"**
3. **Enable "Allow notifications"**
4. **Check all notification channels are enabled**

### Step 6: Disable MIUI Memory Optimization
1. **Go to Settings > Additional settings**
2. **Tap "Developer options"** (enable if not already)
3. **Find "Background process limit"**
4. **Select "Standard limit"** or "No background processes"
5. **Go back to Settings > Apps > E-Responde**
6. **Tap "Other permissions"**
7. **Enable "Start in background"**

### Step 7: Disable MIUI Auto-start Manager
1. **Open "Security" app**
2. **Tap "Permissions"**
3. **Tap "Autostart"**
4. **Find "E-Responde"**
5. **Enable autostart for E-Responde**

### Step 8: Disable MIUI Battery Saver
1. **Go to Settings > Battery & performance**
2. **Tap "Battery saver"**
3. **Make sure it's OFF** or add E-Responde to exceptions

## Additional MIUI Settings

### Disable MIUI Optimization
1. **Go to Settings > Additional settings**
2. **Tap "Developer options"**
3. **Find "MIUI optimization"**
4. **Turn it OFF** (this helps with background apps)

### Enable Background App Refresh
1. **Go to Settings > Apps > E-Responde**
2. **Tap "Battery"**
3. **Enable "Background activity"**
4. **Enable "Allow background activity"**

## Testing Steps

After configuring all settings:

1. **Test with app open** ✅
2. **Test with app in background** ✅
3. **Test with app completely killed** ✅
4. **Test after device restart** ✅

## Why Redmi Devices Are Different

- **MIUI has aggressive battery optimization**
- **Multiple battery saver layers**
- **Autostart restrictions**
- **Memory optimization**
- **Background activity limits**

## If Still Not Working

### Check These Additional Settings:
1. **Settings > Battery & performance > App battery saver > E-Responde > No restrictions**
2. **Settings > Apps > E-Responde > Other permissions > Start in background**
3. **Security app > Battery > App battery saver > E-Responde > No restrictions**
4. **Security app > Permissions > Autostart > E-Responde > Enable**

### MIUI Version Specific:
- **MIUI 12/13**: Use the steps above
- **MIUI 14**: Additional "Background activity" settings
- **MIUI 15**: New "App battery saver" interface

## Success Indicators

You'll know it's working when:
- ✅ Notifications appear when app is killed
- ✅ App can start in background
- ✅ FCM tokens are valid
- ✅ No battery optimization warnings

This comprehensive setup ensures FCM notifications work reliably on Redmi devices even when the app is completely killed.

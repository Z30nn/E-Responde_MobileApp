# SOS Notification System - Complete Guide

## 🆘 How SOS Notifications Work

### **The Flow:**
1. **User A** adds **User B** as their primary emergency contact
2. **User A** triggers an SOS alert (button press or shake gesture)
3. **User B** receives a push notification about the SOS alert
4. **User B** can see the alert in their notification tab

### **Current Implementation Status:**
✅ **Notification channels created** (`e-responde-sos` with red color)  
✅ **Cloud Function deployed** for push notifications  
✅ **Emergency contacts service configured**  
✅ **SOS alert flow implemented**  
✅ **Gyroscope shake-to-SOS** functionality  
✅ **Location tracking** for SOS alerts  

## 📱 SOS Alert Triggers

### **1. Manual SOS Button**
- Located in the SOS tab of the dashboard
- 5-second countdown before sending
- Can be cancelled during countdown

### **2. Shake Gesture (Gyroscope)**
- Shake device to trigger SOS
- Same 5-second countdown as manual
- Automatically navigates to SOS tab

### **3. Police Officer Restriction**
- Police officers cannot use SOS functionality
- Shows "Access Denied" alert for police users

## 🔧 Technical Implementation

### **Emergency Contacts Service (`emergencyContactsService.ts`)**
```typescript
// Key methods:
- getUserEmergencyContacts(userId) // Get all contacts
- getPrimaryEmergencyContacts(userId) // Get primary contacts only
- sendSOSAlert(userId, message) // Send SOS to all primary contacts
- findUsersWithPrimaryContact(phoneNumber) // Find reverse relationships
```

### **SOS Alert Process:**
1. **Get primary contacts** for the user triggering SOS
2. **Send notifications** to each primary contact
3. **Send reverse notifications** to users who have the sender as primary contact
4. **Include location data** (latitude, longitude, address)
5. **Send confirmation** to the sender

### **Notification Data Structure:**
```typescript
{
  fromUserId: string,
  fromUserName: string,
  fromUserPhone: string,
  contactId: string,
  contactName: string,
  contactPhone: string,
  timestamp: string,
  isTest: boolean,
  location: {
    latitude: number,
    longitude: number,
    address: string
  }
}
```

## 📲 Expected Behavior

### **FOREGROUND (App Open):**
✅ Console logs showing FCM message received  
✅ Emergency sound played  
❌ No system notification banner (this is correct)  

### **BACKGROUND (App Minimized):**
✅ Red notification banner appears  
✅ Vibration pattern: [0, 250, 250, 250]  
✅ Red LED light blinking (on supported devices)  
✅ Emergency sound  

### **CLOSED (App Force-Closed):**
✅ Red notification banner appears  
✅ Vibration pattern: [0, 250, 250, 250]  
✅ Red LED light blinking  
✅ Emergency sound  
✅ Tapping notification opens app  

## 🧪 Testing Steps

### **STEP 1: Set up the relationship**
1. Open the app on Device A
2. Go to Emergency Contacts
3. Add Device B user as primary emergency contact
4. Device B user should accept the request

### **STEP 2: Test the SOS alert**
1. On Device A, trigger an SOS alert (button or shake)
2. Check Device B for:
   - Push notification banner (if app in background/closed)
   - Notification in app notification tab
   - Emergency sound (if app in foreground)

## 🔍 Troubleshooting

### **If you don't receive notifications:**

#### **1. Check device settings:**
- Settings > Apps > E-Responde > Notifications
- Make sure "Allow notifications" is ON
- Check if "E-Responde Notifications" channel is enabled
- Check if "SOS Emergency Alerts" channel is enabled

#### **2. Check Firebase Console:**
- Functions > Logs for Cloud Function execution
- Firestore > users collection for FCM tokens

#### **3. Check app state:**
- Test with app in background/closed (not foreground)
- Make sure Do Not Disturb is not blocking notifications

#### **4. Check emergency contacts:**
- Verify you have primary emergency contacts set up
- Check if the contact is registered in the app
- Verify the contact has accepted the primary contact request

## 🎯 Key Features

### **Reverse Notifications**
- If User A has User B as primary contact
- AND User B has User A as primary contact
- Both will receive notifications when either triggers SOS

### **Location Tracking**
- Automatically captures current location
- Uses reverse geocoding for readable addresses
- Fallback to coordinates if geocoding fails

### **Emergency Sound**
- Plays emergency sound for SOS alerts
- Works in foreground, background, and closed states
- Distinct from regular notification sounds

### **Notification Channels**
- **Default**: `e-responde-notifications` (orange)
- **SOS**: `e-responde-sos` (red, high priority)
- Bypasses Do Not Disturb for SOS alerts

## ✅ System Status

The SOS notification system is **fully configured and ready to use**. When someone who has you as their primary emergency contact triggers an SOS alert, you will receive:

1. **Push notification banner** (if app in background/closed)
2. **Notification in app tab**
3. **Emergency sound**
4. **Location information**
5. **Contact details**

The system works bidirectionally - if you have someone as your primary contact AND they have you as their primary contact, both of you will receive notifications when either triggers an SOS alert.

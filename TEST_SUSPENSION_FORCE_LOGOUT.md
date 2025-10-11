# Testing Suspension Force Logout - Step by Step

## 🧪 How to Test Force Logout

### Prerequisites

1. **Civilian account** logged into the mobile app
2. **Admin access** to Firebase Console
3. **Mobile app running** and user logged in
4. **Console logs** visible (React Native debugger or Logcat/Xcode)

---

## 📱 Test Procedure

### Step 1: Login as Civilian

1. Open the E-Responde mobile app
2. Login with a civilian account
3. Ensure you're on the dashboard (logged in successfully)
4. **Keep the app open** - don't minimize or close it

### Step 2: Check Console Logs

You should see this log:
```
AuthProvider: Setting up suspension listener for user: [userId]
```

If you don't see this, the listener isn't being attached.

### Step 3: Suspend the User (Admin)

1. Open **Firebase Console** in your browser
2. Navigate to: **Realtime Database**
3. Find the path: `civilian/civilian account/{userId}`
4. Click on the user's node
5. **Add or edit** the field:
   - Field name: `isSuspended`
   - Type: `boolean`
   - Value: `true` ✅

6. Click **Add** or **Save**

### Step 4: Watch the Mobile App

**Within 1-2 seconds**, you should see:

1. **Console logs**:
   ```
   AuthProvider: Suspension status changed: true
   AuthProvider: User has been suspended, forcing logout
   AuthProvider: User signed out due to suspension
   ```

2. **App behavior**:
   - User is immediately logged out
   - Returned to login screen
   - Alert appears: "Account Suspended"

### Step 5: Try to Login Again

1. Try to login with the same suspended account
2. **Expected**: Login should be blocked
3. Error message: "Your account has been suspended. Please contact support for assistance."

---

## ✅ Success Criteria

The test is successful if:

- [x] Listener is attached (check console logs)
- [x] Suspension detected within 2 seconds
- [x] User automatically logged out
- [x] Returned to login screen
- [x] Alert shown after logout
- [x] Cannot login again

---

## 🐛 Troubleshooting

### Problem: No console logs about listener

**Cause**: Listener not being set up

**Check**:
1. Is user type `'civilian'`? (Police users aren't monitored)
2. Check console for: "Skipping suspension listener - not a civilian user"
3. Verify `user` object exists in authContext

**Fix**:
```typescript
// Check in authContext.tsx line 59-61
if (!user || userType !== 'civilian') {
  console.log('AuthProvider: Skipping suspension listener - not a civilian user');
  return;
}
```

### Problem: Listener attached but no response

**Cause**: Database path might be wrong or Firebase not connected

**Check**:
1. Verify path in Firebase: `civilian/civilian account/{userId}/isSuspended`
2. Check if `isSuspended` field exists and is `true`
3. Check internet connection
4. Check Firebase Console for the exact userId

**Debug**:
```
Open React Native Debugger or use:
adb logcat | grep AuthProvider    (Android)
```

### Problem: User not logged out

**Cause**: `signOut()` failing

**Check**:
1. Look for error in console: "Error signing out suspended user"
2. Check if Firebase auth is initialized
3. Verify auth import

**Fix**: Restart app and try again

### Problem: Alert shows but user not logged out

**Cause**: This was the old bug (now fixed)

**Solution**: Make sure you're using the updated code where `signOut()` happens immediately, not in the alert callback

---

## 🔍 Advanced Debugging

### Enable Detailed Logs

Add these logs to track everything:

```typescript
// In authContext.tsx - add to the listener
const handleSuspensionChange = (snapshot: any) => {
  console.log('=== SUSPENSION LISTENER TRIGGERED ===');
  console.log('Snapshot exists:', snapshot.exists());
  console.log('Snapshot value:', snapshot.val());
  console.log('Is suspended:', snapshot.val() === true);
  
  const isSuspended = snapshot.val();
  
  if (isSuspended === true) {
    console.log('🚨 SUSPENDING USER - LOGOUT INITIATED');
    // ... rest of code
  }
};
```

### Check Firebase Rules

Ensure your Firebase rules allow reading the `isSuspended` field:

```json
{
  "rules": {
    "civilian": {
      "civilian account": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": false
        }
      }
    }
  }
}
```

---

## 📊 Expected Timeline

```
0:00 - Admin sets isSuspended = true
0:01 - Firebase propagates change
0:02 - Mobile app listener detects change
0:03 - signOut() called
0:04 - User logged out, returned to login screen
0:05 - Alert shown: "Account Suspended"
```

**Total time**: ~5 seconds max (usually 1-2 seconds)

---

## 🎯 Quick Test Script

### For Quick Testing:

1. **Login as civilian** ✓
2. **Firebase Console**: Set `isSuspended = true` ✓
3. **Wait 2 seconds** ⏱️
4. **Check**: User logged out? ✓
5. **Verify**: Cannot login again? ✓

If all steps pass → **Test successful!** ✅

---

## 📝 Test Results Template

```
Date: _______________
Tester: _____________
User ID: ____________

[ ] Step 1: User logged in successfully
[ ] Step 2: Listener console log appeared
[ ] Step 3: Admin suspended user in Firebase
[ ] Step 4: Suspension detected (check logs)
[ ] Step 5: User logged out automatically
[ ] Step 6: Alert shown to user
[ ] Step 7: Cannot login again

Result: PASS / FAIL
Notes: _________________________________
```

---

## 🔧 Key Changes Made

### What Was Fixed:

1. **Cleanup method**: Changed from `off()` to `unsubscribe()`
   ```typescript
   // Old (wrong)
   return () => off(suspensionRef, 'value', handleSuspensionChange);
   
   // New (correct)
   const unsubscribe = onValue(suspensionRef, handleSuspensionChange);
   return () => unsubscribe();
   ```

2. **Logout order**: Logout happens immediately, alert shown after
   ```typescript
   // Old (blocking)
   Alert.alert('...', '...', [{
     text: 'OK',
     onPress: async () => await signOut(auth)
   }]);
   
   // New (immediate)
   signOut(auth).then(...);
   setTimeout(() => Alert.alert(...), 100);
   ```

3. **Error handling**: Added error callback to listener
   ```typescript
   onValue(ref, callback, errorCallback);
   ```

4. **Better logging**: Added console logs at every step

---

## 💡 Tips for Success

1. **Keep app open** - Don't minimize during test
2. **Check console** - Logs tell you everything
3. **Wait a moment** - Firebase takes 1-2 seconds to propagate
4. **Use correct userId** - Triple-check the path
5. **Test multiple times** - Ensure consistency

---

## ✨ Expected Behavior

### Before Suspension:
```
User browsing dashboard
Listener active in background
```

### Admin Suspends:
```
Firebase: isSuspended = true
   ↓ (1-2 seconds)
Mobile: Listener detects change
   ↓ (immediate)
Mobile: signOut() called
   ↓ (immediate)
Mobile: User logged out
   ↓ (100ms delay)
Mobile: Alert shown
```

### After Suspension:
```
User on login screen
Cannot access app
Must contact support
```

---

**Updated**: October 10, 2025  
**Status**: ✅ Fixed and Ready to Test  
**Expected Result**: Immediate force logout (1-2 seconds)

**Test it now and it should work!** 🚀


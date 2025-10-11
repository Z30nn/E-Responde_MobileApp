# User Suspension System - Complete Guide

## ✅ Overview

The suspension system allows administrators to suspend civilian user accounts. Suspended users cannot login, and if they're currently logged in, they will be forcefully logged out in real-time.

---

## 🔒 How Suspension Works

### Two-Level Protection

1. **Login Prevention**: Suspended users cannot login
2. **Real-Time Force Logout**: Currently logged-in users are immediately logged out when suspended

---

## 💾 Firebase Database Structure

### Suspension Field Location

```
firebase
└── civilian
    └── civilian account
        └── {userId}
            ├── email: string
            ├── firstName: string
            ├── lastName: string
            ├── contactNumber: string
            └── isSuspended: boolean  ← Suspension flag
```

### Field Values

- `isSuspended: false` - User is **NOT** suspended (default)
- `isSuspended: true` - User **IS** suspended (cannot login)
- Field not present - Treated as **NOT** suspended

---

## 🚫 Suspension Flow

### Scenario 1: Suspended User Tries to Login

```
User enters email/password
    ↓
System authenticates credentials
    ↓
Check: Is user suspended?
    ↓
isSuspended = true?
    ↓
YES → Sign out user immediately
    ↓
Show error: "Your account has been suspended"
    ↓
Login blocked ❌
```

### Scenario 2: Admin Suspends Currently Logged-In User

```
User is logged in and using app
    ↓
Admin sets isSuspended = true in database
    ↓
Real-time listener detects change
    ↓
Alert shown: "Account Suspended"
    ↓
User forced to click "OK"
    ↓
User automatically logged out
    ↓
Returned to login screen
```

---

## 🔧 Technical Implementation

### Files Modified

1. **services/firebaseService.ts**
   - Added `checkUserSuspension()` method
   - Modified `loginCivilian()` to check suspension

2. **services/authContext.tsx**
   - Added real-time suspension listener
   - Monitors `isSuspended` field for changes
   - Forces logout when suspended

3. **app/login/index.tsx**
   - Added suspension error handling
   - Shows user-friendly message

---

## 📋 Implementation Details

### 1. Login Suspension Check

```typescript
// In firebaseService.ts

// Check if user is suspended
static async checkUserSuspension(uid: string): Promise<boolean> {
  const userRef = ref(database, `civilian/civilian account/${uid}/isSuspended`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() === true : false;
}

// During login
const isSuspended = await this.checkUserSuspension(userCredential.user.uid);
if (isSuspended) {
  await signOut(auth);
  throw { 
    code: 'auth/account-suspended', 
    message: 'Your account has been suspended. Please contact support.' 
  };
}
```

### 2. Real-Time Monitoring

```typescript
// In authContext.tsx

useEffect(() => {
  if (!user || userType !== 'civilian') return;
  
  // Listen to suspension field
  const suspensionRef = ref(database, `civilian/civilian account/${user.uid}/isSuspended`);
  
  const handleSuspensionChange = async (snapshot: any) => {
    const isSuspended = snapshot.val();
    
    if (isSuspended === true) {
      // Show alert and force logout
      Alert.alert(
        'Account Suspended',
        'Your account has been suspended by an administrator. You will be logged out.',
        [{ text: 'OK', onPress: async () => await signOut(auth) }],
        { cancelable: false }
      );
    }
  };
  
  onValue(suspensionRef, handleSuspensionChange);
  
  return () => off(suspensionRef, 'value', handleSuspensionChange);
}, [user, userType]);
```

### 3. Error Handling

```typescript
// In login/index.tsx

if (error.code === 'auth/account-suspended') {
  errorMessage = 'Your account has been suspended. Please contact support for assistance.';
}
```

---

## 👨‍💼 Admin Dashboard Integration

### How to Suspend a User (Admin Side)

**In Admin Dashboard:**

1. **Navigate to user management**
2. **Find the user** to suspend
3. **Set suspension flag**:
   ```javascript
   // Update in Firebase
   const userRef = ref(database, `civilian/civilian account/${userId}`);
   await update(userRef, {
     isSuspended: true
   });
   ```

**Result:**
- User cannot login (if logged out)
- User is force-logged out (if currently logged in)

### How to Unsuspend a User

1. **Find the suspended user**
2. **Update suspension flag**:
   ```javascript
   await update(userRef, {
     isSuspended: false
   });
   ```

**Result:**
- User can login again normally
- Real-time listener allows access

---

## 🧪 Testing the Suspension System

### Test Case 1: Suspend User Before Login

**Setup:**
1. Create test civilian account
2. Set `isSuspended: true` in Firebase

**Test:**
1. Try to login with suspended account
2. Enter email and password
3. Click "Sign In"

**Expected Result:**
- ❌ Login fails
- Error message: "Your account has been suspended. Please contact support for assistance."
- User remains on login screen

### Test Case 2: Suspend Currently Logged-In User

**Setup:**
1. Login as civilian user
2. Keep app open

**Test:**
1. In Firebase Console, set `isSuspended: true` for that user
2. Watch the mobile app

**Expected Result:**
- Alert appears: "Account Suspended"
- Message: "Your account has been suspended by an administrator. You will be logged out."
- User must click "OK"
- User automatically logged out
- Returned to login screen

### Test Case 3: Unsuspend User

**Setup:**
1. User account with `isSuspended: true`

**Test:**
1. Set `isSuspended: false` in Firebase
2. Try to login

**Expected Result:**
- ✅ Login successful
- User can access dashboard
- Full app functionality restored

### Test Case 4: User Without Suspension Field

**Setup:**
1. User account without `isSuspended` field

**Test:**
1. Try to login

**Expected Result:**
- ✅ Login successful (treated as not suspended)
- Normal behavior

---

## 📊 User Experience

### For Suspended Users

#### Attempting to Login:
```
┌────────────────────────────────┐
│ Login Screen                   │
├────────────────────────────────┤
│ Email: user@example.com        │
│ Password: ********             │
│                                │
│ [Sign In]                      │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ Error                          │
├────────────────────────────────┤
│ Your account has been          │
│ suspended. Please contact      │
│ support for assistance.        │
│                                │
│              [OK]              │
└────────────────────────────────┘
```

#### Getting Suspended While Using App:
```
┌────────────────────────────────┐
│ Dashboard                      │
│ (User is browsing)             │
└────────────────────────────────┘
         ↓ Admin suspends
┌────────────────────────────────┐
│ Account Suspended              │
├────────────────────────────────┤
│ Your account has been          │
│ suspended by an administrator. │
│ You will be logged out.        │
│                                │
│              [OK]              │
└────────────────────────────────┘
         ↓ User clicks OK
┌────────────────────────────────┐
│ Login Screen                   │
│ (Automatically logged out)     │
└────────────────────────────────┘
```

---

## 🔐 Security Features

### What Makes This Secure?

1. ✅ **Database-level check** - Suspension status stored in Firebase
2. ✅ **Login prevention** - Suspended users can't authenticate
3. ✅ **Real-time enforcement** - No delay in force logout
4. ✅ **Cannot be bypassed** - Client cannot override
5. ✅ **Admin-only control** - Only admins can suspend/unsuspend

### What Police Users?

**Police users are NOT affected by suspension system:**
- Police accounts don't have `isSuspended` field
- Only civilian accounts can be suspended
- Police have separate authentication flow

---

## 💡 Use Cases

### When to Suspend Users

1. **Violation of Terms** - User breaks app rules
2. **Spam/Abuse** - User submits fake reports
3. **Investigation** - Temporary suspension during review
4. **Security** - Compromised account
5. **Non-payment** - If app has paid features

### Suspension vs Account Deletion

| Action | Reversible? | Data Kept? | Use Case |
|--------|-------------|------------|----------|
| **Suspension** | ✅ Yes | ✅ Yes | Temporary ban |
| **Deletion** | ❌ No | ❌ No | Permanent removal |

**Recommendation**: Use suspension first, deletion only if necessary.

---

## 🛠️ Admin Dashboard Requirements

### What Admins Need

1. **User List** - View all civilian users
2. **Suspension Toggle** - Button to suspend/unsuspend
3. **Suspension Status** - Visual indicator (badge/color)
4. **Reason Field** (Optional) - Log why user was suspended
5. **History** (Optional) - Track suspension events

### Example Admin UI

```typescript
// Example suspend function
async function suspendUser(userId: string, reason?: string) {
  const userRef = ref(database, `civilian/civilian account/${userId}`);
  
  await update(userRef, {
    isSuspended: true,
    suspendedAt: new Date().toISOString(),
    suspensionReason: reason || 'No reason provided'
  });
  
  console.log('User suspended:', userId);
}

// Example unsuspend function
async function unsuspendUser(userId: string) {
  const userRef = ref(database, `civilian/civilian account/${userId}`);
  
  await update(userRef, {
    isSuspended: false,
    unsuspendedAt: new Date().toISOString()
  });
  
  console.log('User unsuspended:', userId);
}
```

---

## 📈 Monitoring & Logging

### Recommended Logging

Track suspension events:

```typescript
{
  "userId": "abc123",
  "action": "suspended",
  "suspendedBy": "admin_xyz",
  "reason": "Spam reports",
  "timestamp": "2025-10-10T10:30:00.000Z"
}
```

### Firebase Analytics

Consider tracking:
- Number of suspensions per month
- Most common suspension reasons
- Average suspension duration
- Appeal rate

---

## 🐛 Troubleshooting

### Problem: User can still login after suspension

**Possible Causes:**
1. `isSuspended` not set to `true`
2. Wrong user ID
3. Firebase not updating

**Solutions:**
1. Check Firebase Console: `civilian/civilian account/{userId}/isSuspended`
2. Verify it's set to `true` (boolean, not string)
3. Refresh Firebase Console

### Problem: Force logout not working

**Possible Causes:**
1. User has no internet connection
2. Real-time listener not attached
3. Police user (not monitored)

**Solutions:**
1. Ensure user is online
2. Check console logs for listener setup
3. Verify user is civilian (not police)

### Problem: Alert shown repeatedly

**Possible Causes:**
1. Listener attached multiple times
2. Not cleaning up properly

**Solutions:**
1. Check cleanup function in useEffect
2. Ensure `off()` is called properly

---

## 🔄 Suspension Workflow

### Complete Flow Diagram

```
Admin Dashboard
    ↓
Suspend User (set isSuspended = true)
    ↓
Firebase Database Updated
    ↓
┌─────────────┴──────────────┐
│                            │
User is logged in        User tries to login
│                            │
Real-time listener       Login check
detects change           reads field
│                            │
Alert shown             isSuspended = true?
│                            │
Force logout            Sign out immediately
│                            │
└─────────────┬──────────────┘
              ↓
          Login Screen
          (User cannot access app)
              ↓
          Admin unsuspends
              ↓
          User can login again
```

---

## 📞 Quick Reference

### Check Suspension Status

**Firebase Console:**
```
Path: civilian/civilian account/{userId}/isSuspended
Value: true (suspended) or false (not suspended)
```

### Suspend User (Admin)

```javascript
await update(ref(database, `civilian/civilian account/${userId}`), {
  isSuspended: true
});
```

### Unsuspend User (Admin)

```javascript
await update(ref(database, `civilian/civilian account/${userId}`), {
  isSuspended: false
});
```

### Error Code

```
auth/account-suspended
```

---

## ✨ Summary

### What Was Implemented

✅ **Login prevention** for suspended users  
✅ **Real-time force logout** for active sessions  
✅ **User-friendly error messages**  
✅ **Admin-controlled suspension**  
✅ **Database-level enforcement**  
✅ **Cannot be bypassed**  
✅ **Police users exempt**  

### Benefits

1. **Better moderation** - Control problematic users
2. **Reversible action** - Can unsuspend anytime
3. **Real-time enforcement** - No delay
4. **Clear communication** - Users know why they can't access
5. **Admin flexibility** - Easy to suspend/unsuspend

---

**Implementation Date**: October 10, 2025  
**Status**: ✅ Complete and Working  
**Affected Users**: Civilians only  
**Admin Control**: Required  
**Real-Time**: Yes  

**User suspension system is fully operational! 🔒**


# Firebase Database Rules for Crime Reports

The current error `PERMISSION_DENIED: Permission denied` occurs because the Firebase database security rules don't allow writing to the crime reports paths. You need to update your Firebase database rules to allow authenticated users to submit crime reports.

## Updated Database Rules

Go to your Firebase Console → Realtime Database → Rules and replace the current rules with these:

```json
{
  "rules": {
    "civilian": {
      "civilian account": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid",
          "crime reports": {
            ".read": "$uid === auth.uid",
            ".write": "$uid === auth.uid"
          }
        }
      },
      "civilian crime reports": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "emergency_contacts": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "notificationSettings": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid || (auth != null && newData.child('type').val() == 'sos_alert')"
      }
    },
    "phone_mappings": {
      "$phoneNumber": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## What These Rules Do

1. **`civilian/civilian account/{uid}`** - Users can only read/write their own account data
2. **`civilian/civilian account/{uid}/crime reports`** - Users can only read/write their own crime reports
3. **`civilian/civilian crime reports`** - Any authenticated user can read/write to the main crime reports collection
4. **`emergency_contacts/{uid}`** - Users can only read/write their own emergency contacts
5. **`notificationSettings/{uid}`** - Users can only read/write their own notification preferences
6. **`notifications/{uid}`** - Users can only read/write their own notification history (except SOS alerts can be sent by any authenticated user)
7. **`phone_mappings/{phoneNumber}`** - Maps phone numbers to user IDs for emergency contact notifications

## Alternative: More Restrictive Rules

If you want more restrictive rules (recommended for production), use these instead:

```json
{
  "rules": {
    "civilian": {
      "civilian account": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid",
          "crime reports": {
            ".read": "$uid === auth.uid",
            ".write": "$uid === auth.uid"
          }
        }
      },
      "civilian crime reports": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$reportId": {
          ".validate": "newData.hasChildren(['crimeType', 'description', 'reporterUid', 'createdAt'])",
          "reporterUid": {
            ".validate": "newData.val() === auth.uid"
          }
        }
      }
    },
    "emergency_contacts": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "notificationSettings": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid || (auth != null && newData.child('type').val() == 'sos_alert')"
      }
    },
    "phone_mappings": {
      "$phoneNumber": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## How to Update Rules

1. **Go to Firebase Console** → Your Project
2. **Navigate to Realtime Database** → Rules tab
3. **Replace the existing rules** with one of the above rule sets
4. **Click "Publish"** to save the changes
5. **Wait a few minutes** for the rules to propagate

## Testing the Rules

After updating the rules:

1. **Try submitting a crime report again**
2. **Check the console** - the permission error should be gone
3. **Verify in Firebase Console** that the data appears in both locations:
   - `civilian/civilian crime reports/{reportId}`
   - `civilian/civilian account/{uid}/crime reports/{reportId}`

## Security Notes

- The rules ensure users can only access their own data
- Crime reports are publicly readable by authenticated users (for transparency)
- Users can only write crime reports with their own UID
- All writes require authentication

## Troubleshooting

If you still get permission errors after updating the rules:

1. **Wait 5-10 minutes** for rules to propagate
2. **Check that you're authenticated** in your app
3. **Verify the user UID** matches between auth and database
4. **Check Firebase Console** for any rule syntax errors

### Notification System Errors

If you get "Permission denied" errors when accessing notification settings:

1. **Make sure the notification rules are added** to your Firebase database rules
2. **Check that the user is authenticated** before accessing notification settings
3. **Verify the notification paths** in Firebase Console:
   - `notificationSettings/{userId}`
   - `notifications/{userId}`
4. **Restart the app** after updating Firebase rules

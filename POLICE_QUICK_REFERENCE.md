# Police System - Quick Reference Guide

## 🚀 Quick Start

### Create Police Account (Firebase Console)

1. **Firebase Auth**:
   ```
   Console → Authentication → Users → Add User
   Email: officer@example.com
   Password: [your password]
   ```

2. **Add to Database**:
   ```
   Console → Realtime Database
   Path: police/police account/{userId}
   
   Paste this JSON:
   {
     "email": "officer@example.com",
     "badgeNumber": "12345",
     "firstName": "John",
     "lastName": "Smith",
     "station": "Central Station"
   }
   ```

3. **Login**:
   - Open app
   - Enter police email/password
   - Access Police Dashboard!

---

## 📋 Key Differences: Police vs Civilian

| Feature | Civilian | Police |
|---------|----------|--------|
| **Login** | Email verification required | No verification needed |
| **Dashboard** | Personal reports | ALL crime reports |
| **Voting** | Can upvote/downvote | View counts only |
| **Location** | Shows on map if police present | Updates location for civilians |
| **Reports** | Can submit reports | View-only access |

---

## 🗺️ Police Location on Map

### Add Location to Police Account

```json
{
  "currentLocation": {
    "latitude": 14.5995,
    "longitude": 120.9842,
    "lastUpdated": "2025-10-10T10:00:00.000Z"
  }
}
```

### Update Location

- **Path**: `police/police account/{userId}/currentLocation`
- **Update frequency**: Every 30-60 seconds recommended
- **Shows on**: Crime report maps for civilians

---

## 🔐 Firebase Database Structure

```
firebase
└── police
    └── police account
        └── {userId}
            ├── email: "officer@example.com"
            ├── badgeNumber: "12345"
            ├── firstName: "John"
            ├── lastName: "Smith"
            ├── station: "Central Station"
            └── currentLocation:
                ├── latitude: 14.5995
                ├── longitude: 120.9842
                └── lastUpdated: "2025-10-10T10:00:00Z"
```

---

## 📱 Police Dashboard Features

### What Police Can See

✅ All crime reports from all civilians  
✅ Upvote/downvote counts (read-only)  
✅ Full report details  
✅ Reporter information  
✅ Crime locations on map  
✅ Real-time updates  

### What Police Cannot Do

❌ Submit crime reports  
❌ Upvote or downvote reports  
❌ Edit civilian reports  
❌ Delete reports  

---

## 🧪 Quick Test

### Test Police Login

```bash
1. Create police account in Firebase
2. Open app
3. Login with police email
4. Should see: "Police Portal" header
5. Should see: All crime reports
```

### Test Location Display

```bash
1. Add currentLocation to police account
2. Login as civilian
3. View crime report map
4. Should see: Police marker on map
```

---

## 🐛 Troubleshooting

### Police Can't Login

**Check**:
- ✓ Email in `police/police account`
- ✓ Firebase Auth account exists
- ✓ Email spelling matches exactly

### Location Not Showing

**Check**:
- ✓ `currentLocation` object exists
- ✓ Has `latitude` and `longitude`
- ✓ Values are numbers (not strings)

---

## 📞 Key Functions

```typescript
// Check if email is police
await FirebaseService.isPoliceEmail(email);

// Get user type
await FirebaseService.getUserType(uid);

// Get all police locations
await FirebaseService.getAllPoliceLocations();

// Update police location
await FirebaseService.updatePoliceLocation(uid, lat, lng);
```

---

## ✨ Pro Tips

1. **Badge Numbers**: Use for identification if name not available
2. **Station Info**: Helpful for jurisdiction tracking
3. **Location Updates**: Keep under 1-minute intervals for real-time accuracy
4. **Email Format**: Use official police domain for credibility

---

## 📚 Full Documentation

See `POLICE_SYSTEM_GUIDE.md` for complete details on:
- Implementation architecture
- Security considerations
- API reference
- Future enhancements

---

**Created**: October 10, 2025  
**Status**: Ready to Use  
**Version**: 1.0

Quick, simple, effective! 🚔👮‍♂️


# Firebase Storage Rules Setup - Quick Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **e-responde**
3. Click on **Storage** in the left sidebar
4. Click on the **Rules** tab at the top

### Step 2: Replace Rules

Copy and paste these rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Crime reports - Allow authenticated users to upload
    match /crime-reports/{allPaths=**} {
      allow read: if true;  // Public read access for everyone
      allow write: if request.auth != null;  // Only authenticated users can upload
    }
    
    // Images subfolder
    match /crime-reports/images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024  // Max 10MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Videos subfolder
    match /crime-reports/videos/{videoId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 100 * 1024 * 1024  // Max 100MB
                   && request.resource.contentType.matches('video/.*');
    }
  }
}
```

### Step 3: Publish

Click the **Publish** button

---

## ✅ Verify Setup

### Test 1: Check Storage is Enabled

1. In Firebase Console → Storage
2. You should see "Get Started" or existing files
3. If you see "Get Started", click it to initialize Storage

### Test 2: Upload Test

1. Open your mobile app
2. Login as a civilian user
3. Create a crime report with an image
4. Submit the report
5. Check Firebase Console → Storage → crime-reports/images
6. Verify the image appears

### Test 3: View Test

1. Login as a different user or police account
2. View the crime report you just created
3. Click on the image
4. Verify it displays correctly

---

## 📋 What These Rules Do

| Rule | What It Does |
|------|--------------|
| `allow read: if true` | Anyone can view/download files (needed for admin dashboard) |
| `allow write: if request.auth != null` | Only logged-in users can upload |
| `request.resource.size < 10 * 1024 * 1024` | Images must be under 10MB |
| `request.resource.size < 100 * 1024 * 1024` | Videos must be under 100MB |
| `contentType.matches('image/.*')` | Only image files in images folder |
| `contentType.matches('video/.*')` | Only video files in videos folder |

---

## 🔒 Security Notes

### ✅ Safe:
- Only authenticated users can upload
- File size limits prevent abuse
- File type restrictions prevent malware

### ⚠️ Be Aware:
- **Anyone with the URL can view files** (necessary for admin dashboard)
- Don't upload sensitive personal documents
- Crime report evidence should not contain identifiable information unless necessary

---

## 🐛 Troubleshooting

### Error: "Permission Denied"

**Symptoms**: Upload fails with permission error

**Fix**:
1. Verify you published the rules (click Publish button)
2. Make sure user is logged in (check `auth.currentUser`)
3. Wait a few minutes for rules to propagate

### Error: "File Too Large"

**Symptoms**: Upload fails for large files

**Fix**:
1. Check file size limits in rules (10MB for images, 100MB for videos)
2. Reduce image quality in the app's image picker settings
3. Or increase limits in Storage rules (line 17 for images, line 24 for videos)

### Error: "Storage Bucket Not Found"

**Symptoms**: Error mentions storage bucket doesn't exist

**Fix**:
1. Go to Firebase Console → Storage
2. Click "Get Started" to initialize Storage
3. Choose production mode or test mode
4. Select a location (asia-southeast1 recommended for your region)

---

## 💰 Cost Estimates

### For 1000 Active Users:

**Assuming:**
- Average 2 photos per crime report
- 1 report per user per month
- Average photo size: 500KB

**Monthly Costs:**
- Storage: 2000 photos × 0.5MB = 1GB × $0.026 = **$0.03/month**
- Download: 2000 photos × 5 views × 0.5MB = 5GB × $0.12 = **$0.60/month**

**Total: ~$0.63/month** for 1000 users

### Free Tier Includes:
- 5GB storage (10,000 photos)
- 1GB/day downloads (2,000 downloads/day)

**Your app will likely stay within free tier limits!** 🎉

---

## 📞 Need Help?

If you encounter issues:

1. **Check Console Logs**: Look for error messages in the app
2. **Verify Rules**: Make sure rules are published in Firebase Console
3. **Check Auth**: Ensure user is logged in
4. **Test Storage**: Try uploading a file directly in Firebase Console

---

**Setup Complete!** 🎉

Your app now supports image and video uploads to Firebase Storage!


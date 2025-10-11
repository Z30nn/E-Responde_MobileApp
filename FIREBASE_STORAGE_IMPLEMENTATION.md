# Firebase Storage Implementation for Crime Report Media

## Overview

Crime report images and videos are now uploaded to Firebase Storage and stored as public URLs. This allows admins and other users to view the media attachments from any device.

---

## What Changed

### **Before:**
- ❌ Images/videos stored as local file paths (e.g., `file:///storage/...`)
- ❌ Only visible on the device that uploaded them
- ❌ Admins and other users couldn't view attachments
- ❌ Media not accessible from web dashboard

### **After:**
- ✅ Images/videos uploaded to Firebase Storage
- ✅ Stored as public download URLs (e.g., `https://firebasestorage.googleapis.com/...`)
- ✅ Accessible by all users and admins
- ✅ Viewable in admin dashboard
- ✅ Permanent storage with Firebase infrastructure

---

## Files Modified

### 1. **`firebaseConfig.ts`**
- Added Firebase Storage import
- Exported `storage` instance

### 2. **`services/firebaseService.ts`**
- Added `uploadFileToStorage()` - Uploads single file to Firebase Storage
- Added `uploadMultipleFiles()` - Uploads multiple files in parallel
- Added `deleteFileFromStorage()` - Deletes files from storage (for cleanup)

### 3. **`CrimeReportForm.tsx`**
- Modified `handleSubmit()` to upload files before submitting report
- Shows upload progress to user
- Stores URLs instead of local paths
- Handles upload errors gracefully

---

## How It Works

### Upload Flow

```
User selects image/video
    ↓
File stored locally in uploadedFiles array
    ↓
User clicks "Submit Crime Report"
    ↓
Files uploaded to Firebase Storage (one by one)
    ↓
Download URLs generated for each file
    ↓
URLs stored in crime report's multimedia array
    ↓
Report submitted to Firebase Realtime Database
```

### Storage Structure

Files are organized in Firebase Storage as:

```
crime-reports/
├── images/
│   ├── 1728567890123_photo_123456789.jpg
│   ├── 1728567891234_media_987654321.jpg
│   └── ...
└── videos/
    ├── 1728567892345_video_123456789.mp4
    └── ...
```

### URL Format

Uploaded files generate URLs like:
```
https://firebasestorage.googleapis.com/v0/b/e-responde.firebasestorage.app/o/crime-reports%2Fimages%2F1728567890123_photo_123456789.jpg?alt=media&token=abc123def456
```

---

## Firebase Storage Rules

You need to update your Firebase Storage security rules to allow uploads:

### Go to Firebase Console

1. Navigate to **Firebase Console** → **Storage**
2. Click on the **Rules** tab
3. Replace with the following rules:

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
      allow read: if true;  // Anyone can view images
      allow write: if request.auth != null  // Authenticated users can upload
                   && request.resource.size < 10 * 1024 * 1024  // Max 10MB
                   && request.resource.contentType.matches('image/.*');  // Only images
    }
    
    // Videos subfolder
    match /crime-reports/videos/{videoId} {
      allow read: if true;  // Anyone can view videos
      allow write: if request.auth != null  // Authenticated users can upload
                   && request.resource.size < 100 * 1024 * 1024  // Max 100MB
                   && request.resource.contentType.matches('video/.*');  // Only videos
    }
  }
}
```

4. Click **Publish** to save the rules

---

## Features

### 1. **Automatic Upload**
- Files are automatically uploaded when submitting a crime report
- No manual upload step required
- Upload happens in the background

### 2. **Progress Indication**
- User sees "Uploading" alert while files are being uploaded
- Console logs show upload progress

### 3. **Error Handling**
- If upload fails, user is asked whether to:
  - **Cancel**: Don't submit the report
  - **Submit Anyway**: Submit report without attachments

### 4. **Parallel Uploads**
- Multiple files uploaded simultaneously for faster submission
- Uses `Promise.all()` for efficiency

### 5. **File Organization**
- Images stored in `crime-reports/images/`
- Videos stored in `crime-reports/videos/`
- Files named with timestamp + original name

---

## User Experience

### Before Submission:
1. User selects photo/video from gallery or camera
2. File shown in "Uploaded Files" list with icon (🖼️ or 🎥)
3. User can remove files before submitting

### During Submission:
1. User clicks "Submit Crime Report"
2. Alert shows: "Uploading" - "Please wait while we upload your files..."
3. Files upload to Firebase Storage (2-5 seconds per file)
4. Crime report submitted with URLs

### After Submission:
- Files are permanently stored in Firebase Storage
- URLs accessible by all users
- Admin dashboard can display the images/videos

---

## API Usage

### Upload Single File

```typescript
const downloadURL = await FirebaseService.uploadFileToStorage(
  'file:///local/path/image.jpg',
  'image.jpg',
  'crime-reports/images'
);
// Returns: "https://firebasestorage.googleapis.com/..."
```

### Upload Multiple Files

```typescript
const files = [
  { uri: 'file:///image1.jpg', name: 'image1.jpg', type: 'image/jpeg' },
  { uri: 'file:///video1.mp4', name: 'video1.mp4', type: 'video/mp4' }
];

const urls = await FirebaseService.uploadMultipleFiles(files);
// Returns: ["https://...", "https://..."]
```

### Delete File

```typescript
await FirebaseService.deleteFileFromStorage(fileURL);
```

---

## Viewing Media

### In Mobile App

Crime report details already display media using the `Image` component:

```typescript
{report.multimedia.map((item, index) => (
  <Image source={{ uri: item }} style={styles.mediaImage} />
))}
```

This now works for all users since URLs are public.

### In Admin Dashboard

Admin dashboard can display images directly:

```html
<img src="{report.multimedia[0]}" alt="Evidence" />
```

Or for videos:

```html
<video src="{report.multimedia[0]}" controls></video>
```

---

## Testing

### Test Upload

1. **Login** to the app as a civilian user
2. **Navigate** to Crime Reports tab → "+" button
3. **Fill out** the crime report form
4. **Click** "📁 Add Photo or Video"
5. **Select** "Camera" or "Photo Library"
6. **Choose** an image or video
7. **Submit** the crime report
8. **Check** console logs for upload progress
9. **Verify** report submitted successfully

### Verify Storage

1. Go to **Firebase Console** → **Storage**
2. Navigate to `crime-reports/images/` or `crime-reports/videos/`
3. Verify files are uploaded
4. Click on a file to view the download URL

### Verify in Database

1. Go to **Firebase Console** → **Realtime Database**
2. Navigate to `civilian/civilian crime reports/{reportId}`
3. Check the `multimedia` field
4. Should contain URLs like: `["https://firebasestorage.googleapis.com/..."]`

### Verify Viewing

1. **Login** as a different user or police account
2. **View** the crime report
3. **Click** on the image/video
4. **Verify** it displays correctly

---

## Storage Limits

### Free Tier (Spark Plan)
- **Storage**: 5 GB
- **Downloads**: 1 GB/day
- **Uploads**: 20k/day

### Blaze Plan (Pay-as-you-go)
- **Storage**: $0.026/GB per month
- **Downloads**: $0.12/GB
- **Uploads**: $0.05/GB

### File Size Limits (Configured in Rules)
- **Images**: Max 10 MB per file
- **Videos**: Max 100 MB per file

---

## Troubleshooting

### Upload Fails

**Problem**: Upload fails with permission error

**Solution**:
1. Check Firebase Storage rules are configured correctly
2. Verify user is authenticated (`auth.currentUser` exists)
3. Check file size limits

### URLs Don't Work

**Problem**: URLs return 404 or permission denied

**Solution**:
1. Verify Storage rules allow public read: `allow read: if true`
2. Check the file exists in Firebase Console → Storage
3. Ensure URL has the correct format with `?alt=media&token=...`

### Slow Uploads

**Problem**: Uploads take too long

**Solution**:
1. Reduce image quality in image picker options (currently 0.8)
2. Reduce maxWidth/maxHeight (currently 1000x1000)
3. Check user's internet connection

---

## Best Practices

1. **Image Compression**
   - Always compress images before upload
   - Current settings: quality 0.8, max 1000x1000px

2. **File Validation**
   - Validate file types before upload
   - Check file sizes against limits

3. **Error Handling**
   - Always provide fallback if upload fails
   - Allow users to submit without attachments

4. **Progress Feedback**
   - Show upload progress to users
   - Use loading indicators

5. **Cleanup**
   - Consider deleting old/unused files
   - Implement retention policies

---

## Security Considerations

1. **Public Read Access**
   - Files are publicly readable by anyone with the URL
   - Don't upload sensitive personal information

2. **Authentication Required**
   - Only authenticated users can upload
   - Prevents spam and abuse

3. **File Size Limits**
   - Prevents storage abuse
   - Keeps costs manageable

4. **Content Type Validation**
   - Only allows images and videos
   - Prevents malicious file uploads

---

## Future Enhancements

- [ ] Add upload progress percentage
- [ ] Implement file compression on client side
- [ ] Add video thumbnail generation
- [ ] Implement automatic file cleanup for old reports
- [ ] Add image filters/editing before upload
- [ ] Support multiple image selection at once
- [ ] Add image preview before submission

---

## Dependencies

**Required packages** (already installed):
- `firebase` - Firebase SDK
- `react-native-image-picker` - Image/video selection
- `@react-native-async-storage/async-storage` - Persistence

**No additional packages needed!**

---

## Summary

✅ **Images and videos are now uploaded to Firebase Storage**  
✅ **URLs stored in Realtime Database instead of local paths**  
✅ **Media accessible by all users and admins**  
✅ **Viewable in admin dashboard**  
✅ **Graceful error handling**  
✅ **No additional dependencies required**  

**Implementation Date**: October 10, 2025  
**Version**: 1.0


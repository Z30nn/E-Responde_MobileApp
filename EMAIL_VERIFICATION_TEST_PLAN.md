# Email Verification - Test Plan

## Pre-Test Setup

### Requirements:
- [ ] App running on emulator or physical device
- [ ] Internet connection active
- [ ] Access to a real email account (for receiving verification emails)
- [ ] Firebase Authentication enabled in Firebase Console

### Recommended Test Email:
Use a Gmail account or any email service you can quickly access on your phone or computer.

---

## Test Case 1: New User Registration with Email Verification

### Steps:
1. Launch the E-Responde app
2. Click "Register" or "Sign Up"
3. Fill in the registration form:
   - First Name: `Test`
   - Last Name: `User`
   - Phone Number: `+639123456789`
   - Email: `[your-test-email]@gmail.com`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
4. Click "Sign Up" button

### Expected Results:
- ✅ Success alert appears: "Registration Successful"
- ✅ Message mentions verification email sent
- ✅ Automatically redirected to Email Verification screen
- ✅ Email Verification screen shows your email address
- ✅ Verification email arrives in inbox (within 1-5 minutes)

### Pass Criteria:
- [ ] Registration successful
- [ ] Alert displayed correctly
- [ ] Email Verification screen shown
- [ ] Verification email received

### If Failed:
- Check Firebase Console → Authentication → Users (user should exist)
- Check spam/junk folder for verification email
- Check Firebase Console → Authentication → Templates → Email verification

---

## Test Case 2: Login Attempt WITHOUT Email Verification

### Steps:
1. From Email Verification screen, click "Back to Login"
2. On Login screen, enter:
   - Email: `[your-test-email]@gmail.com`
   - Password: `TestPass123!`
3. Click "Sign In" button

### Expected Results:
- ❌ Login is BLOCKED
- ✅ Alert appears: "Email Not Verified"
- ✅ Message explains verification requirement
- ✅ After clicking "OK", redirected to Email Verification screen
- ✅ User does NOT access the dashboard

### Pass Criteria:
- [ ] Login blocked successfully
- [ ] Clear error message shown
- [ ] Redirected to verification screen
- [ ] Dashboard NOT accessible

### If Failed:
- User should NOT be able to access dashboard without verification
- Check authContext.tsx for email verification check

---

## Test Case 3: Email Verification Process

### Steps:
1. Open your email inbox (on phone or computer)
2. Find email from Firebase/E-Responde
3. Open the email
4. Click the verification link in the email
5. Wait for browser to confirm verification

### Expected Results:
- ✅ Verification email found in inbox or spam
- ✅ Email contains verification link
- ✅ Clicking link opens browser
- ✅ Browser shows "Email verified successfully" or similar message

### Pass Criteria:
- [ ] Email received
- [ ] Link works
- [ ] Verification confirmed in browser

### If Failed:
- Check spam/junk folder
- Use "Resend Verification Email" button in app
- Wait a few minutes for email to arrive

---

## Test Case 4: Check Verification Status in App

### Steps:
1. After clicking verification link in email, return to the app
2. On Email Verification screen, click "I've Verified My Email" button
3. Wait for verification check to complete

### Expected Results:
- ✅ Loading indicator appears briefly
- ✅ Alert appears: "Email Verified!"
- ✅ Success message displayed
- ✅ Button text: "Continue to Login"
- ✅ Clicking button returns to Login screen

### Pass Criteria:
- [ ] Verification detected successfully
- [ ] Success alert shown
- [ ] Can proceed to login

### If Failed:
- Wait 1-2 minutes and try again (verification may take time to propagate)
- Try clicking "Resend Verification Email" and verify again
- Check Firebase Console → Authentication → Users → Your Email (emailVerified should be true)

---

## Test Case 5: Login AFTER Email Verification

### Steps:
1. On Login screen, enter:
   - Email: `[your-test-email]@gmail.com`
   - Password: `TestPass123!`
2. Click "Sign In" button
3. Wait for authentication

### Expected Results:
- ✅ Login successful
- ✅ NO error messages
- ✅ Redirected to Dashboard/Home screen
- ✅ Full access to all app features
- ✅ User can navigate through tabs

### Pass Criteria:
- [ ] Login successful
- [ ] Dashboard accessible
- [ ] All features available
- [ ] No verification warnings

### If Failed:
- Check Firebase Console to confirm email is verified
- Try logging out and logging in again
- Clear app data and try again

---

## Test Case 6: Resend Verification Email

### Steps:
1. Register a new test user (or use unverified account)
2. On Email Verification screen, click "Resend Verification Email"
3. Check email inbox

### Expected Results:
- ✅ Alert appears: "Verification Email Sent"
- ✅ New verification email arrives in inbox
- ✅ Can use new link to verify

### Pass Criteria:
- [ ] Resend works successfully
- [ ] New email received
- [ ] New verification link works

### If Failed:
- Check for rate limiting (wait 1-2 minutes between resend attempts)
- Check Firebase email quota

---

## Test Case 7: Existing User Verification Status

### Steps:
1. Login with existing verified user
2. Verify access is immediate
3. Check user profile shows verified status

### Expected Results:
- ✅ Verified users login immediately
- ✅ No verification screen shown
- ✅ Direct access to dashboard

### Pass Criteria:
- [ ] Verified users not prompted for verification
- [ ] Normal app flow maintained

---

## Test Case 8: Email Verification Error Handling

### Steps:
1. On Email Verification screen, turn off internet
2. Click "I've Verified My Email"
3. Check error handling

### Expected Results:
- ❌ Network error alert shown
- ✅ User-friendly error message
- ✅ Can retry when internet restored

### Pass Criteria:
- [ ] Graceful error handling
- [ ] Clear error messages
- [ ] App doesn't crash

---

## Test Case 9: Firebase Console Verification Check

### Steps:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Navigate to: Authentication → Users
3. Find your test user
4. Check "Email verified" column

### Expected Results:
- ✅ User appears in list
- ✅ "Email verified" shows checkmark after verification
- ✅ No checkmark before verification

### Pass Criteria:
- [ ] User data correct in Firebase
- [ ] Verification status accurate

---

## Test Case 10: Multiple Registration Attempts

### Steps:
1. Try to register with same email again
2. Check error handling

### Expected Results:
- ❌ Registration blocked
- ✅ Error: "An account with this email already exists"
- ✅ User directed to login

### Pass Criteria:
- [ ] Duplicate email prevented
- [ ] Clear error message

---

## Edge Cases to Test

### Edge Case 1: Expired Verification Link
- Wait 3+ days before clicking verification link
- Expected: May need to request new verification email

### Edge Case 2: Multiple Verification Emails
- Request multiple verification emails
- Expected: All links should work, only need to click one

### Edge Case 3: Wrong Email Address
- Register with typo in email
- Expected: Cannot receive verification, need to register again

### Edge Case 4: Verification While Logged Out
- Sign out after registration
- Verify email
- Login again
- Expected: Should work normally

---

## Success Criteria Summary

The email verification system is working correctly if:

- ✅ New users receive verification email
- ✅ Users cannot login without verifying email
- ✅ Verification link works and confirms email
- ✅ Verified users can login normally
- ✅ Clear error messages throughout
- ✅ Resend functionality works
- ✅ Firebase Console shows correct verification status

---

## Test Results Template

| Test Case | Status | Notes | Date Tested |
|-----------|--------|-------|-------------|
| TC1: New Registration | ⬜ Pass / ⬜ Fail | | |
| TC2: Login Without Verification | ⬜ Pass / ⬜ Fail | | |
| TC3: Email Verification | ⬜ Pass / ⬜ Fail | | |
| TC4: Check Status in App | ⬜ Pass / ⬜ Fail | | |
| TC5: Login After Verification | ⬜ Pass / ⬜ Fail | | |
| TC6: Resend Email | ⬜ Pass / ⬜ Fail | | |
| TC7: Existing User | ⬜ Pass / ⬜ Fail | | |
| TC8: Error Handling | ⬜ Pass / ⬜ Fail | | |
| TC9: Firebase Console Check | ⬜ Pass / ⬜ Fail | | |
| TC10: Duplicate Registration | ⬜ Pass / ⬜ Fail | | |

---

## Troubleshooting Guide

### Problem: Verification email not received

**Solutions:**
1. Check spam/junk folder
2. Wait 5-10 minutes (may be delayed)
3. Use "Resend Verification Email" button
4. Check Firebase Console → Authentication → Templates
5. Verify email address was typed correctly

### Problem: Login still blocked after verification

**Solutions:**
1. Click "I've Verified My Email" button in app
2. Wait 1-2 minutes for verification to propagate
3. Check Firebase Console to confirm emailVerified = true
4. Try signing out and signing in again
5. Clear app data and login again

### Problem: Verification link doesn't work

**Solutions:**
1. Make sure you're clicking the latest verification link
2. Check if link has expired (request new one)
3. Try copying and pasting full URL in browser
4. Request new verification email

### Problem: "Too many requests" error

**Solutions:**
1. Wait 1-2 minutes before retrying
2. Firebase has rate limits for verification emails
3. Contact Firebase support if persistent

### Problem: App crashes on verification screen

**Solutions:**
1. Check logs for error details
2. Ensure Firebase is properly initialized
3. Check internet connection
4. Report bug with logs

---

## Test Environment

**Device/Emulator:**
- Device: ________________
- OS Version: ________________
- App Version: ________________

**Network:**
- Connection Type: ________________
- Speed: ________________

**Email Service:**
- Provider: ________________
- Account: ________________

**Firebase:**
- Project: e-responde
- Region: ________________

---

## Testing Checklist

Before marking testing complete:

- [ ] All 10 test cases passed
- [ ] Edge cases tested
- [ ] Error handling verified
- [ ] Firebase Console shows correct data
- [ ] Documentation reviewed
- [ ] Screenshots captured (optional)
- [ ] Test results logged

---

**Test Plan Version**: 1.0  
**Created**: October 10, 2025  
**Status**: Ready for Execution  
**Estimated Time**: 20-30 minutes


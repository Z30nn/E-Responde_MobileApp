# 🧪 E-Responde Testing Guide

Comprehensive testing procedures for all features in the E-Responde mobile application.

---

## Table of Contents
- [Testing Overview](#testing-overview)
- [VoIP Testing](#voip-testing)
- [Email Verification Testing](#email-verification-testing)
- [Duplicate User Prevention Testing](#duplicate-user-prevention-testing)
- [Suspension & Force Logout Testing](#suspension--force-logout-testing)
- [General Feature Testing](#general-feature-testing)
- [Performance Testing](#performance-testing)

---

## Testing Overview

### Test Environment Setup

**Requirements:**
- 2-3 test devices or emulators
- Test accounts (civilian and police)
- Firebase console access
- Stable internet connection

**Test Accounts Needed:**
1. **Civilian Account 1** - For general testing
2. **Civilian Account 2** - For multi-user testing
3. **Police Account** - For police dashboard testing

### Test Types
- ✅ **Functional Testing** - Features work as expected
- ✅ **Integration Testing** - Features work together
- ✅ **User Acceptance Testing** - Real-world scenarios
- ✅ **Performance Testing** - Speed and efficiency
- ✅ **Security Testing** - Data protection and auth

---

## VoIP Testing

For detailed VoIP testing, see [VOIP_TESTING_GUIDE.md](./VOIP_TESTING_GUIDE.md).

### Quick VoIP Test Checklist

#### Test 1: Basic Call Flow ✅
- [ ] Caller can initiate call
- [ ] Receiver gets notification
- [ ] Call connects successfully
- [ ] Audio works both ways
- [ ] Call ends properly

#### Test 2: App-Wide Call Reception ✅
- [ ] Calls received on Home tab
- [ ] Calls received on Profile tab
- [ ] Calls received on Reports tab
- [ ] Calls received on SOS tab
- [ ] Calls received on any screen

#### Test 3: Duplicate Prevention ✅
- [ ] Declining once doesn't show multiple modals
- [ ] No repeated notifications after decline
- [ ] New calls work after declining previous

#### Test 4: Real-Time Sync ✅
- [ ] Caller sees when receiver answers
- [ ] Receiver sees when caller ends call
- [ ] Status updates within 2 seconds
- [ ] No stale UI states

#### Test 5: Edge Cases ✅
- [ ] Call while in another call (auto-reject)
- [ ] Network interruption handling
- [ ] Rapid accept/decline actions
- [ ] Multiple sequential calls

### VoIP Test Result: PASS / FAIL

---

## Email Verification Testing

### Test Plan

#### Test 1: New User Registration ✅

**Steps:**
1. Open app
2. Tap "Register"
3. Fill in all fields with new email
4. Submit registration
5. Check email inbox

**Expected Results:**
- [ ] Registration successful
- [ ] Verification email received within 1 minute
- [ ] Email contains verification link
- [ ] App shows "Email Verification" screen
- [ ] User cannot access main app

#### Test 2: Email Verification Link ✅

**Steps:**
1. Open verification email
2. Click verification link
3. Browser opens showing "Email Verified"
4. Return to app
5. Tap "I've verified my email"

**Expected Results:**
- [ ] Link opens in browser
- [ ] Firebase confirms verification
- [ ] App checks verification status
- [ ] User granted access to app
- [ ] Dashboard loads

#### Test 3: Resend Verification Email ✅

**Steps:**
1. Register new account
2. On verification screen, tap "Resend Email"
3. Wait 60 seconds
4. Tap "Resend Email" again
5. Check email inbox

**Expected Results:**
- [ ] First resend works
- [ ] Success message shown
- [ ] Second resend blocked (cooldown)
- [ ] Cooldown message shown
- [ ] New email received

#### Test 4: Unverified User Login Attempt ✅

**Steps:**
1. Register account but don't verify
2. Close app
3. Reopen app
4. Try to login with unverified account

**Expected Results:**
- [ ] Login successful
- [ ] Email verification screen appears
- [ ] Access to app blocked
- [ ] Can resend verification email
- [ ] Cannot bypass verification

#### Test 5: Already Verified User ✅

**Steps:**
1. Login with already verified account

**Expected Results:**
- [ ] No verification screen shown
- [ ] Direct access to dashboard
- [ ] All features accessible

#### Test 6: Police Account (No Verification) ✅

**Steps:**
1. Login with police account

**Expected Results:**
- [ ] No verification required
- [ ] Direct access to police dashboard
- [ ] All police features accessible

### Email Verification Test Result: PASS / FAIL

---

## Duplicate User Prevention Testing

### Test Plan

#### Test 1: Email Already Registered ✅

**Steps:**
1. Register new account with email: test@example.com
2. Logout
3. Try to register again with same email: test@example.com

**Expected Results:**
- [ ] Registration blocked
- [ ] Error message: "Email already registered"
- [ ] No duplicate account created
- [ ] Firebase Auth shows only one account
- [ ] Firebase Database shows only one user record

#### Test 2: Case-Insensitive Email Check ✅

**Steps:**
1. Register with: TEST@EXAMPLE.COM
2. Logout
3. Try to register with: test@example.com

**Expected Results:**
- [ ] Registration blocked
- [ ] Error shown
- [ ] No duplicate created

#### Test 3: Phone Number Already Registered ✅

**Steps:**
1. Register with phone: +63 912 345 6789
2. Logout  
3. Try to register with same phone but different email

**Expected Results:**
- [ ] Registration blocked
- [ ] Error message: "Phone number already registered"
- [ ] No duplicate created

#### Test 4: Successful Registration ✅

**Steps:**
1. Register with unique email and phone
2. Check Firebase Console

**Expected Results:**
- [ ] Registration successful
- [ ] Firebase Auth account created
- [ ] Firebase Database record created
- [ ] Verification email sent
- [ ] User data properly stored

### Duplicate Prevention Test Result: PASS / FAIL

---

## Suspension & Force Logout Testing

### Test Plan

#### Test 1: Suspend Active User ✅

**Steps:**
1. Login as Civilian Account 1
2. Navigate to any screen
3. **Admin Action:** In Firebase, set `suspended: true` for this user
4. Wait 30 seconds (automatic check interval)

**Expected Results:**
- [ ] User automatically logged out
- [ ] Alert shown: "Your account has been suspended"
- [ ] Redirected to login screen
- [ ] Cannot login again

#### Test 2: Suspended User Login Attempt ✅

**Steps:**
1. Ensure account is suspended in Firebase
2. Try to login

**Expected Results:**
- [ ] Login blocked
- [ ] Error message shown: "Account suspended. Contact support."
- [ ] User cannot access app
- [ ] Error includes suspension reason (if provided)

#### Test 3: Temporary Suspension Expiry ✅

**Steps:**
1. **Admin Action:** Suspend user with expiry date in past
2. Try to login

**Expected Results:**
- [ ] Login successful
- [ ] Suspension auto-removed
- [ ] Full access granted

#### Test 4: Permanent Suspension ✅

**Steps:**
1. **Admin Action:** Suspend user with no expiry date
2. Try to login multiple times
3. Wait several days
4. Try again

**Expected Results:**
- [ ] Login always blocked
- [ ] Suspension persists
- [ ] Only admin can unsuspend

#### Test 5: Unsuspend User ✅

**Steps:**
1. **Admin Action:** Remove `suspended` flag from Firebase
2. Try to login

**Expected Results:**
- [ ] Login successful
- [ ] Full access restored
- [ ] All features work normally

### Suspension Testing Test Result: PASS / FAIL

---

## General Feature Testing

### Crime Reporting ✅

**Test Steps:**
1. Navigate to Reports tab
2. Tap "+" to create report
3. Fill in all fields:
   - Crime type
   - Date/time
   - Description
   - Location (auto-detect)
   - Add 2 photos
   - Select severity
4. Submit report

**Expected Results:**
- [ ] Form validates properly
- [ ] Photos upload successfully
- [ ] Report created in Firebase
- [ ] Report appears in user's list
- [ ] Police can see report

### SOS Alert ✅

**Test Steps:**
1. Add at least one emergency contact
2. Navigate to SOS tab
3. Tap SOS button
4. Wait for 10-second countdown
5. Check emergency contact's phone

**Expected Results:**
- [ ] Countdown shows
- [ ] Alarm sound plays
- [ ] Location detected
- [ ] Alert sent to all contacts
- [ ] Success message shown
- [ ] Alert saved in history

### Emergency Contacts ✅

**Test Steps:**
1. Navigate to Contacts tab
2. Tap "Add Contact"
3. Enter contact details
4. Save contact
5. Edit contact
6. Delete contact

**Expected Results:**
- [ ] Add form validates
- [ ] Contact saves to Firebase
- [ ] Contact appears in list
- [ ] Edit updates data
- [ ] Delete removes contact

### Notifications ✅

**Test Steps:**
1. Submit a crime report
2. Have police update report status
3. Check notifications tab

**Expected Results:**
- [ ] Notification appears
- [ ] Shows correct information
- [ ] Tap to view details
- [ ] Mark as read works
- [ ] Delete works

### Police Dashboard ✅

**Test Steps:**
1. Login as police account
2. View crime reports list
3. Switch to map view
4. Tap on a report
5. Update report status
6. Call reporter (if not anonymous)

**Expected Results:**
- [ ] All reports visible
- [ ] Map shows markers
- [ ] Report details load
- [ ] Status updates successfully
- [ ] Call initiates

---

## Performance Testing

### Load Time Tests

| Screen | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| App Launch | < 3s | ___ | ___ |
| Login | < 2s | ___ | ___ |
| Dashboard | < 2s | ___ | ___ |
| Reports List | < 3s | ___ | ___ |
| Crime Map | < 4s | ___ | ___ |
| Report Details | < 2s | ___ | ___ |

### Memory Usage

| Scenario | Expected | Actual | Pass/Fail |
|----------|----------|--------|-----------|
| App Idle | < 100 MB | ___ | ___ |
| Viewing Reports | < 150 MB | ___ | ___ |
| Active VoIP Call | < 200 MB | ___ | ___ |
| Map View | < 180 MB | ___ | ___ |

### Network Usage

| Feature | Data Usage | Pass/Fail |
|---------|------------|-----------|
| Login | < 50 KB | ___ |
| Load 10 Reports | < 500 KB | ___ |
| Upload Photo | < 2 MB | ___ |
| 1-min VoIP Call | < 5 MB | ___ |

### Battery Impact

Test Duration: 30 minutes of active use

| Feature | Battery Drain | Pass/Fail |
|---------|--------------|-----------|
| Normal Use | < 10% | ___ |
| VoIP Call | < 15% | ___ |
| Map View | < 12% | ___ |
| SOS w/ Location | < 5% | ___ |

---

## Regression Testing Checklist

After any major update, test:

### Core Features
- [ ] User registration
- [ ] User login
- [ ] Email verification
- [ ] Dashboard navigation
- [ ] All tab transitions

### Crime Reporting
- [ ] Submit new report
- [ ] View report list
- [ ] View report details
- [ ] Upload media
- [ ] Update report status (police)

### Communication
- [ ] VoIP calling (initiate)
- [ ] VoIP calling (receive)
- [ ] Call controls (mute, speaker)
- [ ] End call

### Emergency
- [ ] SOS button
- [ ] Add emergency contact
- [ ] Receive SOS notification
- [ ] SOS history

### Settings
- [ ] Change password
- [ ] Update profile
- [ ] Theme toggle
- [ ] Language change
- [ ] Notification settings

---

## Bug Report Template

When you find a bug, report it with this template:

```markdown
### Bug Title
[Brief description]

### Priority
[ ] Critical - App crashes/unusable
[ ] High - Major feature broken
[ ] Medium - Feature partially broken
[ ] Low - Minor issue/cosmetic

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots/Video
[If applicable]

### Environment
- Device: [e.g., Samsung Galaxy S21]
- OS: [e.g., Android 12]
- App Version: [e.g., 1.0.0]

### Additional Context
[Any other relevant information]
```

---

## Test Results Summary Template

Use this template to document test results:

```markdown
## Test Session Summary

**Date:** [Date]
**Tester:** [Name]
**Build Version:** [Version]
**Test Duration:** [Time]

### Test Results

| Test Category | Total Tests | Passed | Failed | Skipped |
|--------------|-------------|--------|--------|---------|
| VoIP | 20 | ___ | ___ | ___ |
| Email Verification | 6 | ___ | ___ | ___ |
| Duplicate Prevention | 4 | ___ | ___ | ___ |
| Suspension | 5 | ___ | ___ | ___ |
| Crime Reporting | 10 | ___ | ___ | ___ |
| SOS | 5 | ___ | ___ | ___ |
| **TOTAL** | **50** | **___** | **___** | **___** |

### Critical Issues Found
1. 
2. 
3. 

### Non-Critical Issues
1. 
2. 
3. 

### Performance Notes
- Load times: ___
- Memory usage: ___
- Battery impact: ___

### Overall Status
[ ] PASS - Ready for release
[ ] PASS WITH ISSUES - Minor issues noted
[ ] FAIL - Critical issues must be fixed

### Recommendations
1. 
2. 
3. 
```

---

## Automated Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

Expected: All tests pass

### TypeScript Check

```bash
npx tsc --noEmit
```

Expected: No errors

### Linter

```bash
npm run lint
```

Expected: No errors or warnings

---

## Test Coverage Goals

Target coverage:
- Unit Tests: > 70%
- Integration Tests: > 60%
- E2E Tests: > 50%

Current coverage:
```bash
npm test -- --coverage
```

---

## Before Release Checklist

- [ ] All critical tests pass
- [ ] No known critical bugs
- [ ] Performance meets targets
- [ ] Security audit complete
- [ ] Firebase rules tested
- [ ] Permissions properly requested
- [ ] Error handling tested
- [ ] Offline mode tested
- [ ] Different device sizes tested
- [ ] Both Android and iOS tested

---

For feature documentation, see [FEATURES.md](./FEATURES.md).
For setup instructions, see [SETUP.md](./SETUP.md).


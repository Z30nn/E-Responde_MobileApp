# VoIP Testing Guide

## Quick Testing Checklist

This guide will help you test the three main improvements to the VoIP system.

---

## Pre-Testing Setup

### Requirements:
- 2 devices or emulators (Civilian and Police accounts)
- Both logged in and connected to Firebase
- At least one crime report with an assigned officer

### Setup Steps:
1. **Device A** (Civilian): Log in as a civilian with a crime report
2. **Device B** (Police): Log in as the police officer assigned to that report

---

## Test 1: App-Wide Call Reception ✅

### Objective: 
Verify that calls can be received from anywhere in the app, not just the crime report screen.

### Steps:

#### Test 1.1: Dashboard Call Reception
1. **Device A**: Navigate to Dashboard (Home screen)
2. **Device B**: Open the crime report and tap "Call Reporter"
3. **Expected Result**: 
   - ✅ Device A shows incoming call modal on Dashboard
   - ✅ Modal shows caller info (police officer name)
   - ✅ Accept/Decline buttons are visible

#### Test 1.2: Profile Screen Call Reception
1. **Device A**: Navigate to Profile tab
2. **Device B**: Call Device A again from crime report
3. **Expected Result**:
   - ✅ Device A shows incoming call modal on Profile screen
   - ✅ Call can be answered from Profile screen

#### Test 1.3: SOS Tab Call Reception
1. **Device A**: Navigate to SOS tab
2. **Device B**: Call Device A
3. **Expected Result**:
   - ✅ Incoming call modal appears on SOS tab
   - ✅ User can accept call

#### Test 1.4: Reports List Call Reception
1. **Device A**: Navigate to Reports tab, viewing list of reports
2. **Device B**: Call Device A
3. **Expected Result**:
   - ✅ Incoming call modal appears over reports list

#### Test 1.5: Reverse Direction (Police Receiving Call)
1. **Device B**: Navigate to Police Dashboard (not in crime report detail)
2. **Device A**: Open crime report and tap "Call Officer"
3. **Expected Result**:
   - ✅ Device B receives call on Dashboard
   - ✅ Can accept from Dashboard

### Success Criteria:
- [ ] All 5 sub-tests pass
- [ ] Incoming call modal appears regardless of current screen
- [ ] Call can be accepted from any screen

---

## Test 2: Duplicate Call Prevention ✅

### Objective:
Verify that declining a call doesn't result in multiple notifications.

### Steps:

#### Test 2.1: Single Decline Notification
1. **Device B**: Initiate call to Device A
2. **Device A**: Wait for incoming call modal to appear
3. **Device A**: Tap "Decline" button
4. **Expected Result**:
   - ✅ Modal disappears immediately
   - ✅ **NO** second modal appears
   - ✅ **NO** third modal appears
   - ✅ Only ONE decline action needed

5. **Device B**: Verify caller screen shows "Call Declined"
6. **Device B**: Screen should close after ~1.5 seconds

#### Test 2.2: Console Verification
1. Open console/logs on Device A
2. **Device B**: Call Device A
3. **Device A**: Decline call
4. **Expected Logs**:
   ```
   VoIPProvider: Received call data: {callId: ...}
   VoIPProvider: Showing incoming call: [callId]
   VoIPProvider: Call status updated: rejected
   VoIPProvider: Incoming call no longer ringing, dismissing
   
   // Should NOT see repeated "Received call data" for same callId
   ```

#### Test 2.3: Multiple Sequential Calls
1. **Device B**: Call Device A → Device A declines
2. Wait 5 seconds
3. **Device B**: Call Device A again (new call) → Device A declines
4. Wait 5 seconds
5. **Device B**: Call Device A third time (new call)
6. **Expected Result**:
   - ✅ Each call is a separate event
   - ✅ Each decline only shows ONE modal
   - ✅ Third call still works normally (not blocked)

### Success Criteria:
- [ ] Declining a call shows only ONE notification
- [ ] No duplicate modals after declining
- [ ] New calls still work after declining previous ones
- [ ] Console logs show call is marked as handled

---

## Test 3: Real-Time UI Synchronization ✅

### Objective:
Verify that caller and receiver screens stay synchronized and show correct call status.

### Steps:

#### Test 3.1: Caller Sees When Receiver Answers
1. **Device B**: Initiate call to Device A
2. **Device B**: Observe screen shows "Calling..." then "Ringing..."
3. **Device A**: Accept the call
4. **Expected Result on Device B**:
   - ✅ Screen updates to "Connected" within 1-2 seconds
   - ✅ Call timer starts
   - ✅ Mute and Speaker buttons are active

#### Test 3.2: Caller Sees When Receiver Declines
1. **Device B**: Initiate call to Device A
2. **Device A**: Decline the call
3. **Expected Result on Device B**:
   - ✅ Screen updates to "Call Declined"
   - ✅ Screen closes automatically after ~1.5 seconds

#### Test 3.3: Receiver Sees When Caller Ends Call
1. **Device B**: Initiate call to Device A
2. **Device A**: Accept the call
3. Both screens show "Connected"
4. **Device B**: Tap "End Call"
5. **Expected Result on Device A**:
   - ✅ Screen updates to "Call Ended" within 1-2 seconds
   - ✅ Screen closes automatically after ~1.5 seconds

#### Test 3.4: Caller Sees When Receiver Ends Call
1. **Device B**: Initiate call to Device A
2. **Device A**: Accept the call
3. Both screens show "Connected"
4. **Device A**: Tap "End Call"
5. **Expected Result on Device B**:
   - ✅ Screen updates to "Call Ended" within 1-2 seconds
   - ✅ Screen closes automatically after ~1.5 seconds

#### Test 3.5: Status Shows During Ringing
1. **Device B**: Initiate call to Device A
2. **Before Device A answers**:
   - Device B shows: "Ringing..."
   - Device A shows: "Incoming Call" (in modal)
3. **Device A**: Accept
4. **Expected Result**:
   - ✅ Both show "Connected"
   - ✅ No lingering "Ringing..." or "Incoming Call" text

#### Test 3.6: Console Verification
1. Open console on both devices
2. **Device B**: Call Device A
3. **Device A**: Accept
4. **Device B**: End call
5. **Expected Logs on Both Devices**:
   ```
   VoiceCallScreen: Setting up call status listener for: [callId]
   VoiceCallScreen: Call status updated: answered
   VoiceCallScreen: Call status updated: ended
   VoiceCallScreen: Cleaning up call status listener
   ```

### Success Criteria:
- [ ] All status changes sync in real-time (< 2 seconds)
- [ ] Caller sees when receiver accepts/declines
- [ ] Receiver sees when caller ends call
- [ ] Screens auto-close after final status
- [ ] No stale UI states (e.g., "Ringing..." when already connected)

---

## Test 4: Edge Cases 🔍

### Test 4.1: Call While In Another Call
1. **Device A** and **Device B**: Establish a call (A calls B, B answers)
2. **Device C** (another user): Try to call Device B
3. **Expected Result**:
   - ✅ Device B does NOT see incoming call modal
   - ✅ Device C's call is auto-rejected
   - ✅ Device C sees "Call Declined" or call ends quickly
   - ✅ Device A and B's call continues uninterrupted

### Test 4.2: Network Interruption During Call
1. **Device B**: Call Device A
2. **Device A**: Accept
3. **Device B**: Turn off WiFi/data for 10 seconds
4. **Device B**: Turn WiFi/data back on
5. **Expected Result**:
   - Call may drop or reconnect (WebRTC behavior)
   - UI should reflect connection state
   - No crashes or frozen screens

### Test 4.3: App Minimized During Incoming Call
1. **Device A**: Minimize the app (home button)
2. **Device B**: Call Device A
3. **Expected Result**:
   - ⚠️ This might NOT work yet (needs push notifications)
   - Document behavior for future enhancement

### Test 4.4: Rapid Accept/Decline
1. **Device B**: Call Device A
2. **Device A**: Rapidly tap "Accept" then "End Call" immediately
3. **Expected Result**:
   - ✅ No crashes
   - ✅ Call ends properly
   - ✅ Both screens return to normal state

### Test 4.5: Call After Declining Previous Call
1. **Device B**: Call Device A
2. **Device A**: Decline
3. Wait 2 seconds
4. **Device B**: Call Device A again
5. **Device A**: Accept this time
6. **Expected Result**:
   - ✅ Second call works normally
   - ✅ No issues from previous declined call

---

## Test 5: Firebase Data Verification 🔍

### Steps:
1. Open Firebase Console → Realtime Database
2. Navigate to `voip_calls/`
3. **Device B**: Call Device A
4. **In Firebase**, verify you see:
   ```json
   {
     "voip_calls": {
       "[callId]": {
         "callId": "...",
         "caller": {
           "userId": "...",
           "userType": "police",
           "name": "Officer Name"
         },
         "callee": {
           "userId": "...",
           "userType": "civilian", 
           "name": "Civilian Name"
         },
         "status": "ringing",
         "createdAt": "2024-..."
       }
     }
   }
   ```

5. **Device A**: Accept call
6. **In Firebase**, status should update to:
   ```json
   "status": "answered",
   "answeredAt": "2024-..."
   ```

7. **Device B**: End call
8. **In Firebase**, status should update to:
   ```json
   "status": "ended",
   "endedAt": "2024-..."
   ```

### Success Criteria:
- [ ] Call record created with status "ringing"
- [ ] Status updates to "answered" when accepted
- [ ] Status updates to "rejected" when declined
- [ ] Status updates to "ended" when call ends
- [ ] All timestamps are present

---

## Test Results Template

Copy this template to record your test results:

```markdown
## VoIP Testing Results

**Date**: [Date]
**Tester**: [Your Name]
**Devices Used**: 
- Device A: [Type/Model]
- Device B: [Type/Model]

### Test 1: App-Wide Call Reception
- [ ] 1.1 Dashboard: PASS / FAIL - Notes: ___
- [ ] 1.2 Profile: PASS / FAIL - Notes: ___
- [ ] 1.3 SOS Tab: PASS / FAIL - Notes: ___
- [ ] 1.4 Reports: PASS / FAIL - Notes: ___
- [ ] 1.5 Reverse: PASS / FAIL - Notes: ___

### Test 2: Duplicate Prevention
- [ ] 2.1 Single Decline: PASS / FAIL - Notes: ___
- [ ] 2.2 Console Logs: PASS / FAIL - Notes: ___
- [ ] 2.3 Sequential Calls: PASS / FAIL - Notes: ___

### Test 3: Real-Time Sync
- [ ] 3.1 Caller Sees Answer: PASS / FAIL - Notes: ___
- [ ] 3.2 Caller Sees Decline: PASS / FAIL - Notes: ___
- [ ] 3.3 Receiver Sees End: PASS / FAIL - Notes: ___
- [ ] 3.4 Caller Sees End: PASS / FAIL - Notes: ___
- [ ] 3.5 Ringing Status: PASS / FAIL - Notes: ___
- [ ] 3.6 Console Logs: PASS / FAIL - Notes: ___

### Test 4: Edge Cases
- [ ] 4.1 Busy Call: PASS / FAIL - Notes: ___
- [ ] 4.2 Network: PASS / FAIL - Notes: ___
- [ ] 4.3 Minimized: PASS / FAIL - Notes: ___
- [ ] 4.4 Rapid Actions: PASS / FAIL - Notes: ___
- [ ] 4.5 After Decline: PASS / FAIL - Notes: ___

### Test 5: Firebase
- [ ] Data Structure: PASS / FAIL - Notes: ___
- [ ] Status Updates: PASS / FAIL - Notes: ___

### Overall Result: PASS / FAIL

**Issues Found**: 
1. 
2. 
3. 

**Additional Notes**:

```

---

## Common Issues & Solutions

### Issue: Incoming call modal doesn't appear
**Check:**
1. Is user logged in?
2. Console: Look for "VoIPProvider: Setting up global incoming call listener"
3. Firebase: Is call record created?
4. Try restarting the app

### Issue: UI not syncing
**Check:**
1. Console: Look for "VoiceCallScreen: Call status updated"
2. Firebase: Is status actually changing?
3. Network: Good internet connection on both devices?

### Issue: Duplicate calls
**Check:**
1. Console: Look for "Call already handled, ignoring"
2. Firebase: Is call status being updated properly?
3. Try clearing app data and re-logging in

---

## Performance Checklist

During all tests, monitor:
- [ ] No memory leaks (app memory stays stable)
- [ ] No crashes
- [ ] UI remains responsive
- [ ] Audio quality is clear
- [ ] Status updates happen quickly (< 2 seconds)
- [ ] Firebase listener cleanup happens properly

---

## Final Notes

- Test with different network conditions (WiFi, 4G, 3G)
- Test with different devices (Android, iOS if applicable)
- Test during high load (multiple users calling)
- Document any unexpected behavior

Good luck with testing! 🎉


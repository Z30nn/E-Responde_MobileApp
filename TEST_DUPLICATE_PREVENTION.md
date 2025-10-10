# Quick Test Guide: Duplicate Prevention

## 🎯 Quick 5-Minute Test

### Test 1: Duplicate Email (Should BLOCK ❌)
```
Step 1: Register first user
  - Email: test@example.com
  - Phone: +639123456789
  - Name: Juan Dela Cruz
  ✅ Registration successful

Step 2: Try to register with same email
  - Email: test@example.com (same)
  - Phone: +639999999999 (different)
  - Name: Maria Santos (different)
  ❌ Should show: "An account with this email already exists"
```

---

### Test 2: Duplicate Phone Number (Should BLOCK ❌)
```
Step 1: Register first user
  - Email: user1@example.com
  - Phone: +639123456789
  - Name: Juan Santos
  ✅ Registration successful

Step 2: Try to register with same phone
  - Email: user2@example.com (different)
  - Phone: +639123456789 (same)
  - Name: Maria Reyes (different)
  ❌ Should show: "An account with this phone number already exists"
```

---

### Test 3: Duplicate Full Name (Should BLOCK ❌)
```
Step 1: Register first user
  - Email: juan1@example.com
  - Phone: +639111111111
  - Name: Juan Dela Cruz
  ✅ Registration successful

Step 2: Try to register with same full name
  - Email: juan2@example.com (different)
  - Phone: +639222222222 (different)
  - Name: Juan Dela Cruz (same first + last)
  ❌ Should show: "An account with this first name and last name combination already exists"
```

---

### Test 4: Same Last Name Only (Should ALLOW ✅)
```
Step 1: Register first user
  - Name: Juan Santos
  ✅ Registration successful

Step 2: Register with same last name, different first
  - Name: Maria Santos (same last name)
  ✅ Should succeed - different first names
```

---

### Test 5: Same First Name Only (Should ALLOW ✅)
```
Step 1: Register first user
  - Name: Juan Santos
  ✅ Registration successful

Step 2: Register with same first name, different last
  - Name: Juan Reyes (same first name)
  ✅ Should succeed - different last names
```

---

### Test 6: Case Sensitivity (Should BLOCK ❌)
```
Step 1: Register first user
  - Email: john@example.com
  - Name: Juan Santos
  ✅ Registration successful

Step 2: Try with different case
  - Email: JOHN@EXAMPLE.COM
  - Name: JUAN SANTOS
  ❌ Should be blocked (case-insensitive check)
```

---

## Expected Results Summary

| Test | Should Block? | Error Message |
|------|--------------|---------------|
| Duplicate Email | ❌ YES | "An account with this email already exists" |
| Duplicate Phone | ❌ YES | "An account with this phone number already exists" |
| Duplicate Full Name | ❌ YES | "An account with this first name and last name combination already exists..." |
| Same Last Name Only | ✅ NO | Registration successful |
| Same First Name Only | ✅ NO | Registration successful |
| Case Variations | ❌ YES | Same as above (case-insensitive) |

---

## Quick Checklist

Before marking complete:

- [ ] Test duplicate email prevention
- [ ] Test duplicate phone prevention
- [ ] Test duplicate full name prevention
- [ ] Test that same last name alone is allowed
- [ ] Test that same first name alone is allowed
- [ ] Test case-insensitive checking
- [ ] Verify error messages are clear
- [ ] Check Firebase Console for data consistency

---

## Firebase Console Verification

After each test:
1. Go to Firebase Console
2. Navigate to: Realtime Database
3. Check: `civilian/civilian account/`
4. Verify: Only unique users created
5. Check: `phone_mappings/` for phone number entries

---

**All tests passing?** ✅ Duplicate prevention is working correctly!

**Any test failing?** ⚠️ Check DUPLICATE_USER_PREVENTION.md for troubleshooting


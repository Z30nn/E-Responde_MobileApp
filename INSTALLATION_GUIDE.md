# 🚀 Installation & Setup Guide

## ✅ Prerequisites

Before starting, ensure you have:
- Node.js >= 18
- React Native development environment set up
- Android Studio (for Android) or Xcode (for iOS)

---

## 📦 Step 1: Install New Dependencies

The refactoring added two new packages: **Formik** and **Yup** for form validation.

```bash
cd E-Responde_MobileApp
npm install
```

This will install:
- `formik@^2.4.5` - Form management
- `yup@^1.3.3` - Schema validation

---

## 🧹 Step 2: Clear Cache (Recommended)

Since we made significant structural changes, clear the Metro bundler cache:

```bash
npm start -- --reset-cache
```

Or manually:

```bash
# Clear watchman
watchman watch-del-all

# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Clear Metro cache
npm start -- --reset-cache
```

---

## 🏃 Step 3: Run the Application

### For Android:
```bash
npm run android
```

### For iOS:
```bash
npm run ios
```

### Start Metro Bundler Only:
```bash
npm start
```

---

## 🔍 Step 4: Verify Installation

### Check if imports work:

1. Open `app/dashboard/index.tsx` - should have no errors
2. Check that these new files exist:
   - `services/apis/index.ts`
   - `services/constants/index.ts`
   - `services/utils/logger.ts`
   - `services/utils/validation-schemas.ts`
3. Run TypeScript check:
   ```bash
   npx tsc --noEmit
   ```

### Test Basic Functionality:

1. **Login Screen** - Should load without errors
2. **Dashboard** - Should display all tabs
3. **SOS Button** - Should be functional
4. **Crime Reports** - Should load and display

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'formik'"
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Module not found: Error: Can't resolve '../crime-report/form'"
**Solution:** Make sure all new `app/` directories were created properly:
```bash
# Check if directories exist
ls -la app/crime-report/form
ls -la app/crime-report/detail
ls -la app/change-password
```

### Issue: TypeScript errors about strict mode
**Solution:** The new `tsconfig.json` enables strict mode. To temporarily disable:
```json
{
  "compilerOptions": {
    "strict": false  // Change to false temporarily
  }
}
```

### Issue: Metro bundler cache issues
**Solution:**
```bash
# Clear all caches
rm -rf node_modules
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build
npm install
npm start -- --reset-cache
```

### Issue: Build fails on Android
**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: Build fails on iOS
**Solution:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

---

## 📝 What Changed?

### Files Added:
- ✅ `app/dashboard/` - Refactored dashboard with tabs
- ✅ `app/login/` - Login screen
- ✅ `app/register/` - Register screen
- ✅ `app/change-password/` - Change password modal
- ✅ `app/crime-report/` - Crime report screens
- ✅ `services/apis/` - API layer
- ✅ `services/constants/` - Constants
- ✅ `services/utils/logger.ts` - Logger utility
- ✅ `services/utils/validation-schemas.ts` - Validation schemas

### Files Modified:
- ✅ `App.tsx` - Updated import path for Dashboard
- ✅ `package.json` - Added formik and yup
- ✅ `tsconfig.json` - Enabled strict mode and path aliases

### Files Preserved (for backward compatibility):
- `Dashboard.tsx` - Still exists but not used
- `Login.tsx` - Still exists but not used
- `Register.tsx` - Still exists but not used
- `ChangePassword.tsx` - Still exists but not used
- `CrimeReportForm.tsx` - Still exists but wrapped
- `CrimeReportDetail.tsx` - Still exists but wrapped
- `CrimeReportsList.tsx` - Still exists but wrapped

> **Note:** Old files are kept to ensure nothing breaks. They can be safely deleted after confirming the new structure works.

---

## ✨ New Features to Use

### 1. Logger Utility
```typescript
import { logger } from './services/utils/logger';

logger.debug('This only shows in development');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

### 2. API Layer
```typescript
import { apis } from './services/apis';

// Login
await apis.auth.login(email, password);

// Get user profile
const profile = await apis.user.getProfile(userId);

// Submit crime report
await apis.reports.submit(reportData);
```

### 3. Constants
```typescript
import { APP_CONSTANTS, ERROR_MESSAGES, COLORS } from './services/constants';

if (contacts.length >= APP_CONSTANTS.MAX_PRIMARY_CONTACTS) {
  Alert.alert('Error', ERROR_MESSAGES.EMERGENCY.MAX_PRIMARY_REACHED(3));
}
```

### 4. Validation Schemas (Formik + Yup)
```typescript
import { Formik } from 'formik';
import { loginSchema } from './services/utils/validation-schemas';

<Formik
  initialValues={{ email: '', password: '' }}
  validationSchema={loginSchema}
  onSubmit={handleLogin}
>
  {/* Form content */}
</Formik>
```

---

## 🎯 Next Development Steps

### Immediate:
1. Run `npm install` to get new dependencies
2. Test the app on your device/emulator
3. Verify all screens work correctly

### Short-term:
1. Replace remaining `console.log` with `logger`
2. Update existing forms to use Formik + Yup
3. Migrate direct Firebase calls to use `apis`
4. Replace hardcoded strings with constants

### Long-term:
1. Add unit tests for new services
2. Add integration tests
3. Implement error tracking (e.g., Sentry)
4. Add analytics

---

## 📚 Documentation

- `REFACTORING_SUMMARY.md` - Complete refactoring details
- `services/apis/index.ts` - API documentation with examples
- `services/utils/validation-schemas.ts` - All validation schemas
- `services/constants/index.ts` - All constants
- `services/utils/logger.ts` - Logger methods

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Cache cleared
- [ ] App runs on Android
- [ ] App runs on iOS
- [ ] Login works
- [ ] Dashboard loads
- [ ] All tabs functional
- [ ] SOS button works
- [ ] Crime reports load
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No linter errors (`npm run lint`)

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check logs:** Look for error messages in Metro bundler
2. **Clear caches:** Run cache clearing commands above
3. **Verify structure:** Ensure all new directories exist
4. **Check imports:** Make sure import paths are correct
5. **Review docs:** Check `REFACTORING_SUMMARY.md` for details

---

**Happy Coding! 🎉**

The codebase is now production-ready, maintainable, and scalable!


# 🚨 E-Responde Mobile Application

A comprehensive emergency response and crime reporting mobile application connecting civilians with law enforcement for faster, more effective public safety management.

---

## 📱 About E-Responde

E-Responde is a React Native mobile application designed to:
- Enable citizens to quickly report crimes with multimedia evidence
- Provide one-tap SOS emergency alerts to designated contacts
- Facilitate real-time voice communication between civilians and police
- Track and monitor crime reports with location-based mapping
- Offer a dedicated police dashboard for law enforcement monitoring

---

## ✨ Key Features

### For Civilians
- 📝 **Crime Reporting** - Submit detailed reports with photos, videos, and location
- 🚨 **SOS Emergency Alerts** - One-tap emergency notification to contacts
- 📞 **VoIP Calling** - Direct voice calls to assigned police officers
- 🗺️ **Crime Map** - View reported crimes in your area
- 👥 **Emergency Contacts** - Manage contacts for SOS alerts
- 🔔 **Notifications** - Real-time updates on report status
- 🌙 **Theme Support** - Light/dark mode
- 🌐 **Multi-Language** - English and Filipino support

### For Police Officers
- 📊 **Crime Dashboard** - Monitor all reported crimes
- 🗺️ **Real-Time Map** - View crime locations and patterns
- 📍 **Location Tracking** - Track officer locations
- 📞 **VoIP Calling** - Call reporters directly
- ✏️ **Status Updates** - Update report investigation status
- 🎯 **Report Assignment** - Assign reports to officers

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- React Native development environment
- Android Studio or Xcode
- Firebase project

### Installation

```bash
# Clone repository
git clone <repository-url>
cd E-Responde_MobileApp

# Install dependencies
npm install

# iOS only (macOS required)
cd ios && bundle exec pod install && cd ..

# Start Metro bundler
npm run start

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios
```

For detailed setup instructions, see **[SETUP.md](./SETUP.md)**.

---

## 📚 Documentation

### Essential Guides
- **[SETUP.md](./SETUP.md)** - Complete installation and configuration guide
- **[FEATURES.md](./FEATURES.md)** - Detailed feature documentation
- **[TESTING.md](./TESTING.md)** - Testing procedures and checklists
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and updates

### Specialized Documentation
- **[VOIP_IMPROVEMENTS_SUMMARY.md](./VOIP_IMPROVEMENTS_SUMMARY.md)** - VoIP system details
- **[VOIP_TESTING_GUIDE.md](./VOIP_TESTING_GUIDE.md)** - VoIP testing procedures

---

## 🏗️ Tech Stack

### Frontend
- **React Native** 0.80.2 - Mobile framework
- **TypeScript** 5.0.4 - Type safety
- **React** 19.1.0 - UI library
- **Expo** - Development tools

### Backend & Services
- **Firebase Authentication** - User authentication
- **Firebase Realtime Database** - Data storage
- **Firebase Storage** - Media file storage
- **WebRTC** (react-native-webrtc) - VoIP calling

### Key Libraries
- **React Native Maps** - Location and mapping
- **Formik + Yup** - Form management and validation
- **Expo Sensors** - Gyroscope for shake detection
- **React Native Image Picker** - Photo/video capture

---

## 📁 Project Structure

```
E-Responde_MobileApp/
├── app/                          # Screen components
│   ├── dashboard/                # Main dashboard with tabs
│   ├── login/                    # Login screen
│   ├── register/                 # Registration screen
│   ├── crime-report/             # Crime reporting screens
│   ├── police-dashboard/         # Police officer dashboard
│   └── ...
├── components/                   # Reusable components
│   ├── incoming-call-modal/      # VoIP incoming call UI
│   ├── voice-call-screen/        # VoIP call screen
│   ├── emergency-contact-form/   # Contact management
│   └── ...
├── services/                     # Business logic & utilities
│   ├── apis/                     # API layer
│   ├── authContext.tsx           # Authentication context
│   ├── voipService.ts            # VoIP service
│   ├── voipContext.tsx           # Global VoIP state
│   ├── firebaseService.ts        # Firebase operations
│   ├── notificationService.ts    # Notifications
│   └── ...
├── assets/                       # Images, icons, fonts
├── firebaseConfig.ts             # Firebase configuration
└── App.tsx                       # Root component
```

---

## 🔐 Security & Permissions

### Firebase Security Rules
Configured with role-based access control:
- Civilians can read/write their own data
- Police can read all reports, write to assigned reports
- Authentication required for all operations

### Required Permissions

**Android:**
- `INTERNET` - Network access
- `ACCESS_FINE_LOCATION` - GPS location
- `CAMERA` - Photo/video capture
- `RECORD_AUDIO` - Voice calls
- `VIBRATE` - SOS alerts

**iOS:**
- `NSLocationWhenInUseUsageDescription`
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# TypeScript check
npx tsc --noEmit

# Linter
npm run lint
```

For comprehensive testing procedures, see **[TESTING.md](./TESTING.md)**.

---

## 🛠️ Development

### Code Style
- **TypeScript** - Strict mode enabled
- **Functional components** - Hooks over class components
- **Modular structure** - Components, styles, and types separated
- **Consistent naming** - camelCase for variables, PascalCase for components

### Best Practices
- Use logger utility instead of console.log
- Use APIs layer for Firebase operations
- Use constants for strings and config
- Separate styles from component logic
- Write TypeScript interfaces for all data structures

---

## 📊 Features Overview

| Feature | Status | Documentation |
|---------|--------|---------------|
| Crime Reporting | ✅ Complete | [FEATURES.md](./FEATURES.md#crime-reporting) |
| SOS Alerts | ✅ Complete | [FEATURES.md](./FEATURES.md#sos-emergency-alert) |
| VoIP Calling | ✅ Complete | [VOIP_IMPROVEMENTS_SUMMARY.md](./VOIP_IMPROVEMENTS_SUMMARY.md) |
| Police Dashboard | ✅ Complete | [FEATURES.md](./FEATURES.md#police-system) |
| Email Verification | ✅ Complete | [FEATURES.md](./FEATURES.md#email-verification) |
| User Suspension | ✅ Complete | [FEATURES.md](./FEATURES.md#user-suspension-system) |
| Location Tracking | ✅ Complete | [FEATURES.md](./FEATURES.md#location-services) |
| Notifications | ✅ Complete | [FEATURES.md](./FEATURES.md#notifications) |
| Emergency Contacts | ✅ Complete | [FEATURES.md](./FEATURES.md#emergency-contacts) |
| Multi-Language | ✅ Complete | English, Filipino |
| Theme Support | ✅ Complete | Light, Dark |

---

## 🐛 Known Issues

1. **VoIP calls** don't work well in emulators (test on real devices)
2. **Offline mode** has limited functionality
3. **Large media files** can slow down uploads
4. Some features are **Android-only** currently

See [CHANGELOG.md](./CHANGELOG.md#known-issues) for full list.

---

## 🗺️ Roadmap

### v2.0.0 (Planned)
- [ ] Push notifications for VoIP calls when app is closed
- [ ] Video call support
- [ ] In-app chat between civilian and police
- [ ] Offline queue for reports
- [ ] Image compression before upload
- [ ] Call history UI
- [ ] Admin web dashboard

See [CHANGELOG.md](./CHANGELOG.md#roadmap) for complete roadmap.

---

## 📄 License

[Specify your license here]

---

## 👥 Team

- **Developers** - [Names]
- **QA Team** - [Names]
- **UI/UX Designers** - [Names]
- **Project Manager** - [Names]

---

## 📞 Support

For issues, questions, or contributions:
- **Email:** [support email]
- **Issues:** [GitHub Issues link]
- **Documentation:** See docs linked above

---

## 🎯 Getting Help

1. Check **[SETUP.md](./SETUP.md)** for installation issues
2. Read **[FEATURES.md](./FEATURES.md)** for feature documentation
3. Review **[TESTING.md](./TESTING.md)** for testing procedures
4. Check **[CHANGELOG.md](./CHANGELOG.md)** for recent changes
5. Search existing issues or create a new one

---

## ⭐ Acknowledgments

- React Native community
- Firebase for backend services
- All contributors and testers
- Open source libraries used

---

**Built with ❤️ for safer communities**

---

## Quick Links

- 📖 [Full Setup Guide](./SETUP.md)
- 🎨 [Features Documentation](./FEATURES.md)
- 🧪 [Testing Guide](./TESTING.md)
- 📝 [Changelog](./CHANGELOG.md)
- 📞 [VoIP Documentation](./VOIP_IMPROVEMENTS_SUMMARY.md)

---

*Last Updated: October 2024*

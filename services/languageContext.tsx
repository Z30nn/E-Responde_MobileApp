import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LanguageType = 'en' | 'fil';

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
  setCurrentUserId: (userId: string | null) => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  setCurrentUserId: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

// Translation keys and values
const translations = {
  en: {
    // Common
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.done': 'Done',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.required': 'Required',

    // Notifications
    'notifications.settings': 'Notification Settings',
    'notifications.customizeDesc': 'Customize your notification preferences',
    'notifications.crimeReports': 'Crime Reports',
    'notifications.emergency': 'Emergency',
    'notifications.general': 'General',
    'notifications.delivery': 'Delivery Settings',
    'notifications.enableCrimeReports': 'Enable Crime Report Notifications',
    'notifications.enableCrimeReportsDesc': 'Receive notifications about crime reports',
    'notifications.newReports': 'New Crime Reports',
    'notifications.newReportsDesc': 'Get notified when other users publish crime reports',
    'notifications.reportSolved': 'Report Solved',
    'notifications.reportSolvedDesc': 'Get notified when your crime report is solved',
    'notifications.reportUpdated': 'Report Updated',
    'notifications.reportUpdatedDesc': 'Get notified when your crime report status is updated',
    'notifications.enableEmergency': 'Enable Emergency Notifications',
    'notifications.enableEmergencyDesc': 'Receive emergency-related notifications',
    'notifications.sosAlerts': 'SOS Alerts',
    'notifications.sosAlertsDesc': 'Get notified when someone with you as primary contact sends SOS',
    'notifications.pushNotifications': 'Push Notifications',
    'notifications.pushNotificationsDesc': 'Enable push notifications on your device',
    'notifications.emailNotifications': 'Email Notifications',
    'notifications.emailNotificationsDesc': 'Receive notifications via email',
    'notifications.quietHours': 'Quiet Hours',
    'notifications.quietHoursDesc': 'Set times when you don\'t want to receive notifications',
    'notifications.setQuietHours': 'Set Quiet Hours',
    'notifications.startTime': 'Start Time',
    'notifications.endTime': 'End Time',
    'notifications.updateFailed': 'Failed to update notification settings',
    'notifications.loadError': 'Failed to load notification settings',
    'notifications.reportSubmitted': 'Crime Report Submitted',
    'notifications.reportSubmittedDesc': 'Your crime report has been submitted successfully and is under review.',

    // Navigation
    'nav.home': 'Home',
    'nav.reports': 'Reports',
    'nav.crimeList': 'Crime List',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',

    // Welcome
    'welcome.joinNow': 'Join now.',
    'welcome.subtitle': 'You are one click away from making your community safer.',
    'welcome.signUp': 'Sign up',
    'welcome.logIn': 'Log in',

    // Authentication
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',
    'auth.forgotPasswordDesc': 'Enter your email address and we\'ll send you instructions to reset your password.',
    'auth.changePassword': 'Change Password',
    'auth.currentPassword': 'Current Password',
    'auth.newPassword': 'New Password',
    'auth.welcome': 'Welcome',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.rememberPassword': 'Remember your password?',
    'auth.createAccount': 'Create Account',

    // Crime Reporting
    'crime.reportCrime': 'Report a Crime',
    'crime.crimeType': 'Type of Crime',
    'crime.selectCrimeType': 'Select crime type',
    'crime.dateTime': 'Date and Time',
    'crime.description': 'Description',
    'crime.descriptionPlaceholder': 'Describe what happened in detail...',
    'crime.location': 'Location',
    'crime.anonymous': 'Anonymous Reporting',
    'crime.anonymousDesc': 'Your name will be included in the report.',
    'crime.submitReport': 'Submit Report',
    'crime.multimediaEvidence': 'Multimedia Evidence',
    'crime.addPhotoVideo': 'Add Photo/Video',
    'crime.addAudio': 'Add Audio',
    'crime.crimeTypes.theft': 'Theft',
    'crime.crimeTypes.assault': 'Assault',
    'crime.crimeTypes.vandalism': 'Vandalism',
    'crime.crimeTypes.fraud': 'Fraud',
    'crime.crimeTypes.harassment': 'Harassment',
    'crime.crimeTypes.breakingEntering': 'Breaking and Entering',
    'crime.crimeTypes.vehicleTheft': 'Vehicle Theft',
    'crime.crimeTypes.drugRelated': 'Drug-related',
    'crime.crimeTypes.domesticViolence': 'Domestic Violence',
    'crime.crimeTypes.other': 'Other',

    // Settings
    'settings.title': 'Settings',
    'settings.notifications': 'Notifications',
    'settings.darkMode': 'Dark Mode',
    'settings.fontSize': 'Font Size',
    'settings.language': 'Language',
    'settings.termsOfService': 'Terms of Service',
    'settings.privacyPolicies': 'Privacy and Policies',
    'settings.giveFeedback': 'Give Us Feedbacks',
    'settings.fontSize.small': 'Small',
    'settings.fontSize.medium': 'Medium',
    'settings.fontSize.large': 'Large',
    'settings.fontSize.smallDesc': 'Compact text for more content',
    'settings.fontSize.mediumDesc': 'Balanced readability (Recommended)',
    'settings.fontSize.largeDesc': 'Enhanced readability',

    // Terms of Service
    'terms.title': 'Terms of Service',
    'terms.acceptance': '1. Acceptance of Terms',
    'terms.acceptanceDesc': 'By accessing and using the E-Responde Mobile Application ("App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
    'terms.description': '2. Description of Service',
    'terms.descriptionDesc': 'E-Responde is a mobile application designed to facilitate crime reporting and emergency response services. The app allows users to report crimes, view crime reports, and access emergency services information.',
    'terms.responsibilities': '3. User Responsibilities',
    'terms.responsibilitiesDesc': '• You are responsible for providing accurate and truthful information when reporting crimes\n• You must not misuse the app for false reports or malicious purposes\n• You are responsible for maintaining the confidentiality of your account\n• You must comply with all applicable laws and regulations',
    'terms.privacy': '4. Privacy and Data Protection',
    'terms.privacyDesc': 'We are committed to protecting your privacy. All personal information and crime reports are handled in accordance with our Privacy Policy and applicable data protection laws. Your data may be shared with law enforcement agencies when necessary for investigation purposes.',
    'terms.emergency': '5. Emergency Services',
    'terms.emergencyDesc': 'This app is not a replacement for emergency services. In case of immediate danger, please contact emergency services directly (911 or local emergency number). The app is designed to supplement, not replace, traditional emergency reporting methods.',
    'terms.liability': '6. Limitation of Liability',
    'terms.liabilityDesc': 'E-Responde shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the app, including but not limited to damages for loss of profits, data, or other intangible losses.',
    'terms.modifications': '7. Modifications to Terms',
    'terms.modificationsDesc': 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the app after changes constitutes acceptance of the new terms.',
    'terms.contact': '8. Contact Information',
    'terms.contactDesc': 'For questions regarding these Terms of Service, please contact us at:\nEmail: e.respondeofficial@gmail.com\nPhone: +1 (555) 123-4567',
    'terms.lastUpdated': 'Last updated:',

    // Privacy Policy
    'privacy.title': 'Privacy and Policies',
    'privacy.informationCollected': '1. Information We Collect',
    'privacy.informationCollectedDesc': 'We collect information you provide directly to us, such as when you create an account, report a crime, or contact us for support. This may include:\n• Personal information (name, email, phone number)\n• Crime report details and descriptions\n• Location data (with your permission)\n• Device information and usage data',
    'privacy.howWeUse': '2. How We Use Your Information',
    'privacy.howWeUseDesc': 'We use the information we collect to:\n• Process and forward crime reports to appropriate authorities\n• Provide and maintain our services\n• Communicate with you about your reports\n• Improve our app and services\n• Ensure the safety and security of our users',
    'privacy.informationSharing': '3. Information Sharing',
    'privacy.informationSharingDesc': 'We may share your information in the following circumstances:\n• With law enforcement agencies when required for investigations\n• With emergency services when necessary\n• With your explicit consent\n• To comply with legal obligations\n• To protect the rights and safety of our users',
    'privacy.dataSecurity': '4. Data Security',
    'privacy.dataSecurityDesc': 'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.',
    'privacy.dataRetention': '5. Data Retention',
    'privacy.dataRetentionDesc': 'We retain your information for as long as necessary to provide our services and comply with legal obligations. Crime reports may be retained longer as required by law enforcement agencies.',
    'privacy.yourRights': '6. Your Rights',
    'privacy.yourRightsDesc': 'You have the right to:\n• Access your personal information\n• Correct inaccurate information\n• Request deletion of your information\n• Withdraw consent for data processing\n• File a complaint with relevant authorities',
    'privacy.locationServices': '7. Location Services',
    'privacy.locationServicesDesc': 'Our app may request access to your location to provide accurate crime reporting. Location data is only used for the specific purpose of crime reporting and is not shared with third parties except as described in this policy.',
    'privacy.childrensPrivacy': '8. Children\'s Privacy',
    'privacy.childrensPrivacyDesc': 'Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.',
    'privacy.changesToPolicy': '9. Changes to This Policy',
    'privacy.changesToPolicyDesc': 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the app. Your continued use of our services after such changes constitutes acceptance of the updated policy.',
    'privacy.contactUs': '10. Contact Us',
    'privacy.contactUsDesc': 'If you have any questions about this Privacy Policy, please contact us at:\nEmail: e.respondeofficial@gmail.com\nPhone: +1 (555) 123-4567',
    'privacy.lastUpdated': 'Last updated:',

    // Messages
    'message.passwordChanged': 'Password changed successfully',
    'message.passwordResetSent': 'Password reset email sent',
    'message.reportSubmitted': 'Crime report submitted successfully',
    'message.loginSuccess': 'Login successful',
    'message.logoutSuccess': 'Logout successful',
    'message.errorOccurred': 'An error occurred',
    'message.invalidCredentials': 'Invalid email or password',
    'message.passwordMismatch': 'Passwords do not match',
    'message.weakPassword': 'Password must be at least 6 characters',
    'message.invalidEmail': 'Please enter a valid email address',
    'message.oldPasswordReuse': 'You cannot use your old password as the new password',

    // Crime List
    'crimeList.loading': 'Loading crime reports...',
    'crimeList.failedToLoad': 'Failed to load crime reports',
    'crimeList.userNotAuthenticated': 'User not authenticated',
    'crimeList.noReports': 'No crime reports from others',
    'crimeList.beFirstToReport': 'Be the first to report a crime in your area',
    'crimeList.retry': 'Retry',

    // Dashboard Sections
    'dashboard.crimeList': 'Crime List',
    'dashboard.crimeListDesc': 'View crime reports from other users in your area.',
    'dashboard.recentCrimeReports': 'Recent Crime Reports',
    'dashboard.yourCrimeReports': 'Your Crime Reports',

    // Emergency Contacts
    'emergency.title': 'Emergency Contacts',
    'emergency.noContacts': 'No Emergency Contacts',
    'emergency.noContactsDesc': 'Add emergency contacts to ensure help is available when you need it most.',
    'emergency.addFirstContact': 'Add Your First Contact',
    'emergency.loadError': 'Unable to Load Contacts',
    'emergency.loading': 'Loading contacts...',
    'emergency.authRequired': 'Authentication Required',
    'emergency.authRequiredDesc': 'Please log in to manage your emergency contacts.',
    'emergency.primary': 'PRIMARY',
    'emergency.deleteContact': 'Delete Contact',
    'emergency.deleteConfirm': 'Are you sure you want to delete',
    'emergency.delete': 'Delete',
    'emergency.deleteSuccess': 'Contact deleted successfully',
    'emergency.deleteError': 'Failed to delete contact',
    'emergency.addContact': 'Add Emergency Contact',
    'emergency.editContact': 'Edit Contact',
    'emergency.name': 'Name',
    'emergency.namePlaceholder': 'Enter full name',
    'emergency.phoneNumber': 'Phone Number',
    'emergency.relationship': 'Relationship',
    'emergency.relationshipPlaceholder': 'e.g., Spouse, Parent, Friend',
    'emergency.setPrimary': 'Set as Primary Contact',
    'emergency.primaryDesc': 'Primary contact will be notified first in emergency situations',
    'emergency.nameRequired': 'Name is required',
    'emergency.phoneRequired': 'Phone number is required',
    'emergency.phoneInvalid': 'Please enter a valid Philippine phone number (+63 followed by 10 digits)',
    'emergency.testSOS': 'Test SOS Alert',
    'emergency.testSOSDesc': 'This will send a test SOS alert to your primary emergency contacts. Continue?',
    'emergency.sendTest': 'Send Test',
    'emergency.sosSent': 'SOS Alert Sent',
    'emergency.sosSentDesc': 'Test SOS alert sent to your emergency contacts.',
    'emergency.sosError': 'Failed to send SOS alert',
    'emergency.noPrimaryContacts': 'No Primary Contacts',
    'emergency.noPrimaryContactsDesc': 'You need at least one primary emergency contact to test SOS alerts.',
    'emergency.sosAlert': 'SOS Alert',
    'emergency.sosConfirm': 'This will send an SOS alert to your primary emergency contacts. This is for real emergencies only. Continue?',
    'emergency.sendSOS': 'Send SOS',
    'emergency.relationshipRequired': 'Relationship is required',
    'emergency.saveError': 'Failed to save emergency contact. Please try again.',
    'emergency.longPressHint': 'Long press for options',

    // Profile
    'profile.email': 'Email',
    'profile.contactNumber': 'Contact Number',
  },
  fil: {
    // Common
    'common.cancel': 'Kanselahin',
    'common.save': 'I-save',
    'common.submit': 'Ipasa',
    'common.close': 'Isara',
    'common.loading': 'Naglo-load...',
    'common.error': 'May Error',
    'common.success': 'Matagumpay',
    'common.yes': 'Oo',
    'common.no': 'Hindi',
    'common.ok': 'OK',
    'common.back': 'Bumalik',
    'common.next': 'Susunod',
    'common.previous': 'Nakaraan',
    'common.done': 'Tapos',
    'common.edit': 'I-edit',
    'common.delete': 'Burahin',
    'common.confirm': 'Kumpirmahin',
    'common.required': 'Kailangan',

    // Notifications
    'notifications.settings': 'Mga Setting ng Notification',
    'notifications.customizeDesc': 'I-customize ang inyong mga preference sa notification',
    'notifications.crimeReports': 'Mga Ulat ng Krimen',
    'notifications.emergency': 'Emergency',
    'notifications.general': 'Pangkalahatan',
    'notifications.delivery': 'Mga Setting ng Delivery',
    'notifications.enableCrimeReports': 'I-enable ang Crime Report Notifications',
    'notifications.enableCrimeReportsDesc': 'Tumanggap ng mga notification tungkol sa crime reports',
    'notifications.newReports': 'Mga Bagong Crime Reports',
    'notifications.newReportsDesc': 'Makatanggap ng notification kapag may ibang user na nag-publish ng crime report',
    'notifications.reportSolved': 'Nalutas na ang Report',
    'notifications.reportSolvedDesc': 'Makatanggap ng notification kapag nalutas na ang inyong crime report',
    'notifications.reportUpdated': 'Na-update ang Report',
    'notifications.reportUpdatedDesc': 'Makatanggap ng notification kapag na-update ang status ng inyong crime report',
    'notifications.enableEmergency': 'I-enable ang Emergency Notifications',
    'notifications.enableEmergencyDesc': 'Tumanggap ng mga notification na may kinalaman sa emergency',
    'notifications.sosAlerts': 'Mga SOS Alert',
    'notifications.sosAlertsDesc': 'Makatanggap ng notification kapag may nag-send ng SOS na may inyo bilang primary contact',
    'notifications.pushNotifications': 'Push Notifications',
    'notifications.pushNotificationsDesc': 'I-enable ang push notifications sa inyong device',
    'notifications.emailNotifications': 'Email Notifications',
    'notifications.emailNotificationsDesc': 'Tumanggap ng mga notification sa pamamagitan ng email',
    'notifications.quietHours': 'Quiet Hours',
    'notifications.quietHoursDesc': 'I-set ang mga oras na hindi kayo gustong tumanggap ng notification',
    'notifications.setQuietHours': 'I-set ang Quiet Hours',
    'notifications.startTime': 'Oras ng Simula',
    'notifications.endTime': 'Oras ng Tapos',
    'notifications.updateFailed': 'Hindi na-update ang notification settings',
    'notifications.loadError': 'Hindi na-load ang notification settings',
    'notifications.reportSubmitted': 'Na-submit na ang Crime Report',
    'notifications.reportSubmittedDesc': 'Matagumpay na na-submit ang inyong crime report at kasalukuyang sinusuri.',

    // Navigation
    'nav.home': 'Home',
    'nav.reports': 'Mga Ulat',
    'nav.crimeList': 'Listahan ng Krimen',
    'nav.settings': 'Mga Setting',
    'nav.profile': 'Profile',

    // Welcome
    'welcome.joinNow': 'Sumali na.',
    'welcome.subtitle': 'Isang click na lang at mas ligtas na ang inyong komunidad.',
    'welcome.signUp': 'Mag-sign up',
    'welcome.logIn': 'Mag-log in',

    // Authentication
    'auth.login': 'Mag-login',
    'auth.register': 'Mag-register',
    'auth.logout': 'Mag-logout',
    'auth.firstName': 'Pangalan',
    'auth.lastName': 'Apelyido',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Kumpirmahin ang Password',
    'auth.forgotPassword': 'Nakalimutan ang Password?',
    'auth.resetPassword': 'I-reset ang Password',
    'auth.forgotPasswordDesc': 'Ilagay ang inyong email address at ipapadala namin sa inyo ang mga instruksyon para i-reset ang inyong password.',
    'auth.changePassword': 'Palitan ang Password',
    'auth.currentPassword': 'Kasalukuyang Password',
    'auth.newPassword': 'Bagong Password',
    'auth.welcome': 'Maligayang Pagdating',
    'auth.signIn': 'Mag-sign In',
    'auth.signUp': 'Mag-sign Up',
    'auth.dontHaveAccount': 'Walang account?',
    'auth.alreadyHaveAccount': 'May account na?',
    'auth.rememberPassword': 'Naaalala ninyo ang inyong password?',
    'auth.createAccount': 'Gumawa ng Account',

    // Crime Reporting
    'crime.reportCrime': 'Mag-ulat ng Krimen',
    'crime.crimeType': 'Uri ng Krimen',
    'crime.selectCrimeType': 'Piliin ang uri ng krimen',
    'crime.dateTime': 'Petsa at Oras',
    'crime.description': 'Paglalarawan',
    'crime.descriptionPlaceholder': 'Ilarawan nang detalyado ang nangyari...',
    'crime.location': 'Lokasyon',
    'crime.anonymous': 'Anonymous na Pag-ulat',
    'crime.anonymousDesc': 'Ang inyong pangalan ay isasama sa ulat.',
    'crime.submitReport': 'Ipasa ang Ulat',
    'crime.multimediaEvidence': 'Multimedia na Ebidensya',
    'crime.addPhotoVideo': 'Magdagdag ng Larawan/Video',
    'crime.addAudio': 'Magdagdag ng Audio',
    'crime.crimeTypes.theft': 'Pagnanakaw',
    'crime.crimeTypes.assault': 'Pagsalakay',
    'crime.crimeTypes.vandalism': 'Pagsira ng Ari-arian',
    'crime.crimeTypes.fraud': 'Pandaraya',
    'crime.crimeTypes.harassment': 'Pangha-harass',
    'crime.crimeTypes.breakingEntering': 'Pagsira at Pagsalakay',
    'crime.crimeTypes.vehicleTheft': 'Pagnanakaw ng Sasakyan',
    'crime.crimeTypes.drugRelated': 'May Kinalaman sa Droga',
    'crime.crimeTypes.domesticViolence': 'Karahasan sa Tahanan',
    'crime.crimeTypes.other': 'Iba pa',

    // Settings
    'settings.title': 'Mga Setting',
    'settings.notifications': 'Mga Notification',
    'settings.darkMode': 'Dark Mode',
    'settings.fontSize': 'Laki ng Font',
    'settings.language': 'Wika',
    'settings.termsOfService': 'Mga Tuntunin ng Serbisyo',
    'settings.privacyPolicies': 'Privacy at mga Patakaran',
    'settings.giveFeedback': 'Magbigay ng Feedback',
    'settings.fontSize.small': 'Maliit',
    'settings.fontSize.medium': 'Katamtaman',
    'settings.fontSize.large': 'Malaki',
    'settings.fontSize.smallDesc': 'Maliit na teksto sa mas maraming nilalaman',
    'settings.fontSize.mediumDesc': 'Balanseng pagbabasa (INIRERECOMENDA)',
    'settings.fontSize.largeDesc': 'Malaking teksto para sa mas maayos na pagbabasa',

    // Terms of Service
    'terms.title': 'Mga Tuntunin ng Serbisyo',
    'terms.acceptance': '1. Pagtanggap sa mga Tuntunin',
    'terms.acceptanceDesc': 'Sa pag-access at paggamit ng E-Responde Mobile Application ("App"), tinatanggap at sumasang-ayon kayo na maging nakatali sa mga tuntunin at probisyon ng kasunduang ito. Kung hindi kayo sumasang-ayon sa nasa itaas, mangyaring huwag gamitin ang serbisyong ito.',
    'terms.description': '2. Paglalarawan ng Serbisyo',
    'terms.descriptionDesc': 'Ang E-Responde ay isang mobile application na idinisenyo upang mapadali ang pag-uulat ng krimen at mga serbisyo ng emergency response. Pinapahintulutan ng app ang mga user na mag-ulat ng krimen, tingnan ang mga ulat ng krimen, at ma-access ang impormasyon ng mga serbisyo ng emergency.',
    'terms.responsibilities': '3. Mga Responsibilidad ng User',
    'terms.responsibilitiesDesc': '• Responsable kayo sa pagbibigay ng tumpak at totoong impormasyon kapag nag-uulat ng krimen\n• Hindi ninyo dapat gamitin ang app para sa mga maling ulat o masamang layunin\n• Responsable kayo sa pagpapanatili ng pagiging lihim ng inyong account\n• Dapat kayong sumunod sa lahat ng naaangkop na batas at regulasyon',
    'terms.privacy': '4. Privacy at Proteksyon ng Data',
    'terms.privacyDesc': 'Nakatuon kami sa pagprotekta ng inyong privacy. Lahat ng personal na impormasyon at mga ulat ng krimen ay hinahawakan alinsunod sa aming Privacy Policy at naaangkop na mga batas sa proteksyon ng data. Ang inyong data ay maaaring ibahagi sa mga ahensya ng batas kapag kinakailangan para sa mga layunin ng imbestigasyon.',
    'terms.emergency': '5. Mga Serbisyo ng Emergency',
    'terms.emergencyDesc': 'Ang app na ito ay hindi kapalit ng mga serbisyo ng emergency. Sa kaso ng agarang panganib, mangyaring makipag-ugnayan sa mga serbisyo ng emergency nang direkta (911 o lokal na numero ng emergency). Ang app ay idinisenyo upang maging suplemento, hindi kapalit, ng mga tradisyonal na paraan ng pag-uulat ng emergency.',
    'terms.liability': '6. Limitasyon ng Pananagutan',
    'terms.liabilityDesc': 'Ang E-Responde ay hindi mananagot para sa anumang direkta, hindi direkta, incidental, espesyal, o mga pinsala na nagreresulta mula sa paggamit o kawalan ng kakayahang gamitin ang app, kabilang ngunit hindi limitado sa mga pinsala para sa pagkawala ng kita, data, o iba pang hindi nasasalat na pagkawala.',
    'terms.modifications': '7. Mga Pagbabago sa mga Tuntunin',
    'terms.modificationsDesc': 'Nakalaan namin ang karapatan na baguhin ang mga tuntuning ito anumang oras. Ang mga pagbabago ay magiging epektibo kaagad pagkatapos i-post. Ang inyong patuloy na paggamit ng app pagkatapos ng mga pagbabago ay nangangahulugan ng pagtanggap sa mga bagong tuntunin.',
    'terms.contact': '8. Impormasyon ng Contact',
    'terms.contactDesc': 'Para sa mga katanungan tungkol sa mga Tuntunin ng Serbisyo na ito, mangyaring makipag-ugnayan sa amin sa:\nEmail: e.respondeofficial@gmail.com\nPhone: +1 (555) 123-4567',
    'terms.lastUpdated': 'Huling na-update:',

    // Privacy Policy
    'privacy.title': 'Privacy at mga Patakaran',
    'privacy.informationCollected': '1. Impormasyong Kinokolekta Namin',
    'privacy.informationCollectedDesc': 'Kinokolekta namin ang impormasyon na ibinibigay ninyo nang direkta sa amin, tulad ng kapag gumawa kayo ng account, nag-ulat ng krimen, o nakipag-ugnayan sa amin para sa suporta. Maaaring kabilang dito:\n• Personal na impormasyon (pangalan, email, numero ng telepono)\n• Mga detalye at paglalarawan ng ulat ng krimen\n• Data ng lokasyon (sa inyong pahintulot)\n• Impormasyon ng device at data ng paggamit',
    'privacy.howWeUse': '2. Paano Namin Ginagamit ang Inyong Impormasyon',
    'privacy.howWeUseDesc': 'Ginagamit namin ang impormasyon na kinokolekta namin upang:\n• I-proseso at ipasa ang mga ulat ng krimen sa naaangkop na mga awtoridad\n• Magbigay at mapanatili ang aming mga serbisyo\n• Makipag-ugnayan sa inyo tungkol sa inyong mga ulat\n• Pagbutihin ang aming app at mga serbisyo\n• Tiyakin ang kaligtasan at seguridad ng aming mga user',
    'privacy.informationSharing': '3. Pagbabahagi ng Impormasyon',
    'privacy.informationSharingDesc': 'Maaari naming ibahagi ang inyong impormasyon sa mga sumusunod na kalagayan:\n• Sa mga ahensya ng batas kapag kinakailangan para sa mga imbestigasyon\n• Sa mga serbisyo ng emergency kapag kinakailangan\n• Sa inyong tahasang pahintulot\n• Upang sumunod sa mga legal na obligasyon\n• Upang protektahan ang mga karapatan at kaligtasan ng aming mga user',
    'privacy.dataSecurity': '4. Seguridad ng Data',
    'privacy.dataSecurityDesc': 'Nagpapatupad kami ng naaangkop na mga hakbang sa seguridad upang protektahan ang inyong personal na impormasyon laban sa hindi awtorisadong pag-access, pagbabago, pagbubunyag, o pagkasira. Kabilang dito ang encryption, secure servers, at regular na mga security audit.',
    'privacy.dataRetention': '5. Pagpapanatili ng Data',
    'privacy.dataRetentionDesc': 'Pinapanatili namin ang inyong impormasyon hangga\'t kinakailangan upang magbigay ng aming mga serbisyo at sumunod sa mga legal na obligasyon. Ang mga ulat ng krimen ay maaaring panatilihin nang mas matagal ayon sa kinakailangan ng mga ahensya ng batas.',
    'privacy.yourRights': '6. Inyong mga Karapatan',
    'privacy.yourRightsDesc': 'May karapatan kayo na:\n• Ma-access ang inyong personal na impormasyon\n• Itama ang hindi tumpak na impormasyon\n• Humiling ng pagbura ng inyong impormasyon\n• Bawiin ang pahintulot para sa pagproseso ng data\n• Mag-file ng reklamo sa mga naaangkop na awtoridad',
    'privacy.locationServices': '7. Mga Serbisyo ng Lokasyon',
    'privacy.locationServicesDesc': 'Ang aming app ay maaaring humiling ng access sa inyong lokasyon upang magbigay ng tumpak na pag-uulat ng krimen. Ang data ng lokasyon ay ginagamit lamang para sa tiyak na layunin ng pag-uulat ng krimen at hindi ibinabahagi sa mga third party maliban sa inilarawan sa patakarang ito.',
    'privacy.childrensPrivacy': '8. Privacy ng mga Bata',
    'privacy.childrensPrivacyDesc': 'Ang aming mga serbisyo ay hindi inilaan para sa mga batang wala pang 13 taong gulang. Hindi namin sinasadyang kinokolekta ang personal na impormasyon mula sa mga batang wala pang 13. Kung malaman namin na nakolekta namin ang gayong impormasyon, gagawa kami ng mga hakbang upang burahin ito.',
    'privacy.changesToPolicy': '9. Mga Pagbabago sa Patakarang Ito',
    'privacy.changesToPolicyDesc': 'Maaari naming i-update ang Privacy Policy na ito paminsan-minsan. Aabisuhan namin kayo ng anumang pagbabago sa pamamagitan ng pag-post ng bagong Privacy Policy sa app. Ang inyong patuloy na paggamit ng aming mga serbisyo pagkatapos ng mga pagbabago ay nangangahulugan ng pagtanggap sa na-update na patakaran.',
    'privacy.contactUs': '10. Makipag-ugnayan sa Amin',
    'privacy.contactUsDesc': 'Kung may mga katanungan kayo tungkol sa Privacy Policy na ito, mangyaring makipag-ugnayan sa amin sa:\nEmail: e.respondeofficial@gmail.com\nPhone: +1 (555) 123-4567',
    'privacy.lastUpdated': 'Huling na-update:',

    // Messages
    'message.passwordChanged': 'Matagumpay na napalitan ang password',
    'message.passwordResetSent': 'Naipadala ang email para sa pag-reset ng password',
    'message.reportSubmitted': 'Matagumpay na naipasa ang ulat ng krimen',
    'message.loginSuccess': 'Matagumpay na nag-login',
    'message.logoutSuccess': 'Matagumpay na nag-logout',
    'message.errorOccurred': 'May naganap na error',
    'message.invalidCredentials': 'Hindi wasto ang email o password',
    'message.passwordMismatch': 'Hindi magkatugma ang mga password',
    'message.weakPassword': 'Ang password ay dapat na hindi bababa sa 6 na karakter',
    'message.invalidEmail': 'Mangyaring maglagay ng wastong email address',
    'message.oldPasswordReuse': 'Hindi ninyo maaaring gamitin ang inyong lumang password bilang bagong password',

    // Crime List
    'crimeList.loading': 'Naglo-load ng mga ulat ng krimen...',
    'crimeList.failedToLoad': 'Hindi ma-load ang mga ulat ng krimen',
    'crimeList.userNotAuthenticated': 'Hindi naka-authenticate ang user',
    'crimeList.noReports': 'Walang mga ulat ng krimen mula sa iba',
    'crimeList.beFirstToReport': 'Kayo ang unang mag-ulat ng krimen sa inyong lugar',
    'crimeList.retry': 'Subukan ulit',

    // Dashboard Sections
    'dashboard.crimeList': 'Listahan ng Krimen',
    'dashboard.crimeListDesc': 'Tingnan ang mga ulat ng krimen mula sa ibang mga user sa inyong lugar.',
    'dashboard.recentCrimeReports': 'Mga Kamakailang Ulat ng Krimen',
    'dashboard.yourCrimeReports': 'Mga Ulat Mong Krimen',

    // Emergency Contacts
    'emergency.title': 'Mga Emergency Contact',
    'emergency.noContacts': 'Walang Emergency Contacts',
    'emergency.noContactsDesc': 'Magdagdag ng emergency contacts upang matiyak na may tulong na available kapag kailangan ninyo.',
    'emergency.addFirstContact': 'Magdagdag ng Emergency Contact',
    'emergency.loadError': 'Hindi Ma-load ang mga Contact',
    'emergency.loading': 'Naglo-load ng mga contact...',
    'emergency.authRequired': 'Kailangan ng Authentication',
    'emergency.authRequiredDesc': 'Mangyaring mag-log in upang ma-manage ang inyong emergency contacts.',
    'emergency.primary': 'PANGUNAHIN',
    'emergency.deleteContact': 'I-delete ang Contact',
    'emergency.deleteConfirm': 'Sigurado ba kayong gusto ninyong i-delete',
    'emergency.delete': 'I-delete',
    'emergency.deleteSuccess': 'Matagumpay na na-delete ang contact',
    'emergency.deleteError': 'Hindi ma-delete ang contact',
    'emergency.addContact': 'Magdagdag ng contact',
    'emergency.editContact': 'I-edit ang Contact',
    'emergency.name': 'Pangalan',
    'emergency.namePlaceholder': 'Ilagay ang buong pangalan',
    'emergency.phoneNumber': 'Numero ng Telepono',
    'emergency.relationship': 'Relasyon',
    'emergency.relationshipPlaceholder': 'hal., Asawa, Magulang, Kaibigan',
    'emergency.setPrimary': 'I-set bilang Primary Contact',
    'emergency.primaryDesc': 'Ang primary contact ay unang ma-notify sa emergency situations',
    'emergency.nameRequired': 'Kailangan ang pangalan',
    'emergency.phoneRequired': 'Kailangan ang numero ng telepono',
    'emergency.phoneInvalid': 'Mangyaring maglagay ng valid na Philippine phone number (+63 na sinusundan ng 10 digits)',
    'emergency.testSOS': 'I-test ang SOS Alert',
    'emergency.testSOSDesc': 'Ito ay magse-send ng test SOS alert sa inyong mga primary emergency contacts. Ituloy?',
    'emergency.sendTest': 'I-send ang Test',
    'emergency.sosSent': 'Na-send na ang SOS Alert',
    'emergency.sosSentDesc': 'Na-send na ang test SOS alert sa inyong mga emergency contacts.',
    'emergency.sosError': 'Hindi ma-send ang SOS alert',
    'emergency.noPrimaryContacts': 'Walang Primary Contacts',
    'emergency.noPrimaryContactsDesc': 'Kailangan ninyo ng kahit isang primary emergency contact upang ma-test ang SOS alerts.',
    'emergency.sosAlert': 'SOS Alert',
    'emergency.sosConfirm': 'Ito ay magse-send ng SOS alert sa inyong mga primary emergency contacts. Para lang ito sa mga tunay na emergency. Ituloy?',
    'emergency.sendSOS': 'I-send ang SOS',
    'emergency.relationshipRequired': 'Kailangan ang relasyon',
    'emergency.saveError': 'Hindi ma-save ang emergency contact. Mangyaring subukan ulit.',
    'emergency.longPressHint': 'Long press para sa mga opsyon',

    // Profile
    'profile.email': 'Email',
    'profile.contactNumber': 'Numero ng Telepono',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>('en');
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);

  const setCurrentUserId = (userId: string | null) => {
    setCurrentUserIdState(userId);
    if (userId) {
      loadLanguage(userId);
    }
    // Don't reset to default when user logs out - keep current settings
  };

  const loadLanguage = async (userId: string) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(`language_${userId}`);
      if (savedLanguage) {
        setLanguageState(savedLanguage as LanguageType);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (newLanguage: LanguageType) => {
    if (!currentUserId) return;
    
    setLanguageState(newLanguage);
    try {
      await AsyncStorage.setItem(`language_${currentUserId}`, newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        setCurrentUserId,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

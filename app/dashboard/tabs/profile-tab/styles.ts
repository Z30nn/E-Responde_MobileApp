import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) => StyleSheet.create({
  profileScrollView: {
    flex: 1,
    backgroundColor: theme.background,
  },
  profileContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
    marginTop: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: theme.background,
    fontSize: fonts.title + 14,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: fonts.title,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactInfoBox: {
    backgroundColor: theme.menuBackground,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  contactInfoItem: {
    marginBottom: 6,
  },
  contactInfoLabel: {
    color: theme.secondaryText,
    fontSize: fonts.caption,
    marginBottom: 4,
    fontWeight: '500',
  },
  contactInfoText: {
    color: theme.text,
    fontSize: fonts.body,
    fontWeight: '600',
  },
  settingsContainer: {
    backgroundColor: theme.menuBackground,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.secondaryText,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.settingsBackground,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuItemText: {
    fontSize: fonts.body,
    color: theme.text,
  },
  chevronRight: {
    fontSize: 20,
    color: theme.secondaryText,
  },
  themeSwitch: {
    transform: [{ scale: 1.2 }],
  },
  gyroscopeSettingContainer: {
    flex: 1,
    marginRight: 10,
  },
  gyroscopeSettingDescription: {
    fontSize: fonts.caption - 1,
    color: theme.secondaryText,
    marginTop: 2,
    lineHeight: 14,
  },
  gyroscopeSwitch: {
    transform: [{ scale: 1.2 }],
  },
  fontSizePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontSizePreviewText: {
    fontSize: fonts.caption,
    color: theme.secondaryText,
    fontWeight: '500',
  },
  languagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languagePreviewText: {
    fontSize: fonts.caption,
    color: theme.secondaryText,
    fontWeight: '500',
  },
  cleanupMenuItem: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  cleanupInfo: {
    flex: 1,
    marginRight: 10,
  },
  cleanupSubtext: {
    color: theme.secondaryText,
    fontSize: fonts.caption,
    marginTop: 4,
    opacity: 0.7,
  },
  cleanupButton: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutButtonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: fonts.body,
    fontWeight: '600',
  },
});


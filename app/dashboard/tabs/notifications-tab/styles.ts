import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) => StyleSheet.create({
  notificationsContainer: {
    flex: 1,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground,
    borderBottomColor: theme.border,
    marginTop: 0,
  },
  sectionHeaderTitle: {
    fontSize: fonts.subtitle,
    fontWeight: '700',
    color: theme.text,
  },
  notificationHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  threeDotButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  threeDotText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  notificationMenu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: theme.menuBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 150,
  },
  notificationMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  notificationMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fonts.body,
    color: theme.secondaryText,
  },
});


import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) => StyleSheet.create({
  reportsTabContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 0,
  },
  reportsSection: {
    flex: 1,
    width: '100%',
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground,
    borderBottomColor: theme.border,
    marginTop: 0,
    position: 'relative',
  },
  sectionHeaderTitle: {
    fontSize: fonts.subtitle,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: isDarkMode ? theme.menuBackground : '#FFFFFF',
    position: 'absolute',
    right: 20,
  },
  filterIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    tintColor: isDarkMode ? theme.text : '#374151',
  },
  filterButtonText: {
    color: isDarkMode ? theme.text : '#374151',
    fontSize: fonts.caption - 2,
    fontWeight: '600',
  },
  reportButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: fonts.body,
    fontWeight: '600',
  },
});


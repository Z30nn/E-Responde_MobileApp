import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) => StyleSheet.create({
  crimeListTabContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.menuBackground,
    marginTop: 40,
    position: 'relative',
    width: '100%',
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
    top: 16,
    right: 10,
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
  contentText: {
    fontSize: 16,
    color: theme.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: 10,
  },
  crimeListSection: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    minHeight: 400,
  },
});


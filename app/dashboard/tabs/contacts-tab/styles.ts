import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any) => StyleSheet.create({
  emergencyContactsContainer: {
    flex: 1,
    width: '100%',
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


import { StyleSheet } from 'react-native';

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: 50,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    headerSpacer: {
      width: 60,
    },
    headerTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    closeButtonText: {
      fontSize: fonts.body,
      fontWeight: '600',
      color: theme.primary,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    sectionText: {
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.6,
      color: theme.textSecondary,
    },
    lastUpdatedContainer: {
      marginTop: 16,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    lastUpdatedText: {
      fontSize: fonts.caption,
      fontStyle: 'italic',
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });


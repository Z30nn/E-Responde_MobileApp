import { StyleSheet } from 'react-native';
import { Theme, FontSizes } from '../../services/themeContext';

export const createStyles = (theme: Theme, fonts: FontSizes, isDarkMode: boolean) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    button: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.primary,
      minWidth: 80,
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: theme.border,
      opacity: 0.5,
    },
    buttonText: {
      color: 'white',
      fontSize: fonts.body,
      fontWeight: '600',
    },
    buttonTextDisabled: {
      color: theme.secondaryText,
    },
    pageNumberButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.menuBackground,
      borderWidth: 1,
      borderColor: theme.border,
      minWidth: 120,
      justifyContent: 'center',
    },
    pageNumberText: {
      color: theme.text,
      fontSize: fonts.body,
      fontWeight: '600',
      marginRight: 8,
    },
    dropdownArrow: {
      color: theme.text,
      fontSize: fonts.caption,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropdownContainer: {
      backgroundColor: theme.background,
      borderRadius: 12,
      width: '70%',
      maxWidth: 300,
      maxHeight: '60%',
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    dropdownTitle: {
      fontSize: fonts.subtitle,
      fontWeight: 'bold',
      color: theme.text,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dropdownList: {
      maxHeight: 300,
    },
    dropdownItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dropdownItemActive: {
      backgroundColor: theme.primary,
    },
    dropdownItemText: {
      fontSize: fonts.body,
      color: theme.text,
      fontWeight: '500',
    },
    dropdownItemTextActive: {
      color: 'white',
      fontWeight: '600',
    },
  });
};


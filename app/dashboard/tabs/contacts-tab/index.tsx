import React, { FC } from 'react';
import { View, Text } from 'react-native';
import EmergencyContactsList from '../../../../components/emergency-contacts-list';
import { createStyles } from './styles';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';

interface ContactsTabProps {
  userId: string | null;
}

const ContactsTab: FC<ContactsTabProps> = ({ userId }) => {
  const { isDarkMode, fontSize } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts);

  return (
    <View style={styles.emergencyContactsContainer}>
      {userId ? (
        <EmergencyContactsList userId={userId} />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

export default ContactsTab;


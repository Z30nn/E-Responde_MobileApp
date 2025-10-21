import React, { FC } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { createStyles } from './styles';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const PrivacyPolicy: FC<PrivacyPolicyProps> = ({ onClose }) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* 1. Information We Collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.informationCollected')}</Text>
            <Text style={styles.sectionText}>{t('privacy.informationCollectedDesc')}</Text>
          </View>

          {/* 2. How We Use Your Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.howWeUse')}</Text>
            <Text style={styles.sectionText}>{t('privacy.howWeUseDesc')}</Text>
          </View>

          {/* 3. Information Sharing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.informationSharing')}</Text>
            <Text style={styles.sectionText}>{t('privacy.informationSharingDesc')}</Text>
          </View>

          {/* 4. Data Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.dataSecurity')}</Text>
            <Text style={styles.sectionText}>{t('privacy.dataSecurityDesc')}</Text>
          </View>

          {/* 5. Data Retention */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.dataRetention')}</Text>
            <Text style={styles.sectionText}>{t('privacy.dataRetentionDesc')}</Text>
          </View>

          {/* 6. Your Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.yourRights')}</Text>
            <Text style={styles.sectionText}>{t('privacy.yourRightsDesc')}</Text>
          </View>

          {/* 7. Location Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.locationServices')}</Text>
            <Text style={styles.sectionText}>{t('privacy.locationServicesDesc')}</Text>
          </View>

          {/* 8. Children's Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.childrensPrivacy')}</Text>
            <Text style={styles.sectionText}>{t('privacy.childrensPrivacyDesc')}</Text>
          </View>

          {/* 9. Changes to This Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.changesToPolicy')}</Text>
            <Text style={styles.sectionText}>{t('privacy.changesToPolicyDesc')}</Text>
          </View>

          {/* 10. Contact Us */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.contactUs')}</Text>
            <Text style={styles.sectionText}>{t('privacy.contactUsDesc')}</Text>
          </View>

          {/* Last Updated */}
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              {t('privacy.lastUpdated')} {getCurrentDate()}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
        </View>
      </View>
    </Modal>
  );
};

export default PrivacyPolicy;


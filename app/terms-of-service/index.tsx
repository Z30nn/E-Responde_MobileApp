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

interface TermsOfServiceProps {
  onClose: () => void;
}

const TermsOfService: FC<TermsOfServiceProps> = ({ onClose }) => {
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
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{t('terms.title')}</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* 1. Acceptance of Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.acceptance')}</Text>
            <Text style={styles.sectionText}>{t('terms.acceptanceDesc')}</Text>
          </View>

          {/* 2. Description of Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.description')}</Text>
            <Text style={styles.sectionText}>{t('terms.descriptionDesc')}</Text>
          </View>

          {/* 3. User Responsibilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.responsibilities')}</Text>
            <Text style={styles.sectionText}>{t('terms.responsibilitiesDesc')}</Text>
          </View>

          {/* 4. Privacy and Data Protection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.privacy')}</Text>
            <Text style={styles.sectionText}>{t('terms.privacyDesc')}</Text>
          </View>

          {/* 5. Emergency Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.emergency')}</Text>
            <Text style={styles.sectionText}>{t('terms.emergencyDesc')}</Text>
          </View>

          {/* 6. Limitation of Liability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.liability')}</Text>
            <Text style={styles.sectionText}>{t('terms.liabilityDesc')}</Text>
          </View>

          {/* 7. Modifications to Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.modifications')}</Text>
            <Text style={styles.sectionText}>{t('terms.modificationsDesc')}</Text>
          </View>

          {/* 8. Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.contact')}</Text>
            <Text style={styles.sectionText}>{t('terms.contactDesc')}</Text>
          </View>

          {/* Last Updated */}
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              {t('terms.lastUpdated')} {getCurrentDate()}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default TermsOfService;


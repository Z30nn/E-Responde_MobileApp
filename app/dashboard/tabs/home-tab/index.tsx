import React, { FC, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import CrimeListFromOthers, { CrimeListFromOthersRef } from '../../../../CrimeListFromOthers';
import { createStyles } from './styles';

interface HomeTabProps {
  onViewReport: (reportId: string) => void;
  crimeListRef: React.RefObject<CrimeListFromOthersRef | null>;
  isVisible?: boolean;
}

const HomeTab: FC<HomeTabProps> = ({ onViewReport, crimeListRef, isVisible = true }) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  return (
    <View style={styles.crimeListTabContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{t('dashboard.crimeList')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            crimeListRef.current?.openFilterModal();
          }}
        >
          <Image
            source={require('../../../../assets/filter.png')}
            style={styles.filterIcon}
            resizeMode="contain"
          />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.contentText}>
        {t('dashboard.crimeListDesc')}
      </Text>

      <View style={styles.crimeListSection}>
        <CrimeListFromOthers
          ref={crimeListRef}
          onViewReport={onViewReport}
          isVisible={isVisible}
        />
      </View>
    </View>
  );
};

export default HomeTab;


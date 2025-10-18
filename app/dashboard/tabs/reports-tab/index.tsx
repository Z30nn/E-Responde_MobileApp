import React, { FC } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import CrimeReportsList from '../../../../CrimeReportsList';
import { createStyles } from './styles';

interface ReportsTabProps {
  onViewReport: (reportId: string) => void;
  onCreateReport: () => void;
  selectedStatus: string;
  onFilterPress: () => void;
}

const ReportsTab: FC<ReportsTabProps> = ({
  onViewReport,
  onCreateReport,
  selectedStatus,
  onFilterPress,
}) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  return (
    <View style={styles.reportsTabContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{t('dashboard.yourCrimeReports')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <Image
            source={require('../../../../assets/filter.png')}
            style={styles.filterIcon}
            resizeMode="contain"
          />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.reportsSection}>
        <CrimeReportsList
          onViewReport={onViewReport}
          selectedStatus={selectedStatus}
        />
      </View>

      <TouchableOpacity
        style={styles.reportButton}
        onPress={onCreateReport}
        activeOpacity={0.7}
      >
        <Text style={styles.reportButtonText}>{t('crime.reportCrime')}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ReportsTab;


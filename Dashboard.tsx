import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import CrimeReportForm from './CrimeReportForm';
import CrimeReportsList from './CrimeReportsList';
import CrimeReportDetail from './CrimeReportDetail';
import CrimeListFromOthers from './CrimeListFromOthers';

// Import your SVG icons here
// import HomeIcon from './assets/home.svg';
// import ProfileIcon from './assets/profile.svg';
// import EmergencyIcon from './assets/emergency.svg';
// import ReportsIcon from './assets/reports.svg';
// import SettingsIcon from './assets/settings.svg';

const Dashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState(2);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const tabs = [
    { id: 0, name: 'Crime List', icon: '🏠' },
    { id: 1, name: 'Contacts', icon: '👤' },
    { id: 2, name: 'SOS', icon: '🚨' },
    { id: 3, name: 'Report', icon: '📊' },
    { id: 4, name: 'Settings', icon: '⚙️' },
  ];

  const handleTabPress = (tabId: number) => {
    setActiveTab(tabId);
    // Add navigation logic here if needed
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <View style={styles.crimeListTabContainer}>
            <Text style={styles.contentTitle}>Crime List</Text>
            <Text style={styles.contentText}>
              View crime reports from other users in your area.
            </Text>
            
            <View style={styles.crimeListSection}>
              <Text style={styles.crimeListSectionTitle}>Recent Crime Reports</Text>
              <CrimeListFromOthers onViewReport={(reportId) => setSelectedReportId(reportId)} />
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Profile</Text>
            <Text style={styles.contentText}>
              View and edit your profile information here.
            </Text>
          </View>
        );
      case 2:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Emergency</Text>
            <Text style={styles.contentText}>
              Quick access to emergency services and contacts.
            </Text>
          </View>
        );
      case 3:
        return (
          <View style={styles.reportsTabContainer}>
            
            <View style={styles.reportsSection}>
              <Text style={styles.reportsSectionTitle}>Your Crime Reports</Text>
              <CrimeReportsList onViewReport={(reportId) => setSelectedReportId(reportId)} />
            </View>
            
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setShowCrimeReportForm(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.reportButtonText}>Report Crime</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Settings</Text>
            <Text style={styles.contentText}>
              Configure your app preferences and account settings.
            </Text>
            {onLogout && (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {showCrimeReportForm ? (
        <CrimeReportForm
          onClose={() => setShowCrimeReportForm(false)}
          onSuccess={() => {
            setShowCrimeReportForm(false);
            // Optionally refresh data or show success message
          }}
        />
      ) : selectedReportId ? (
        <CrimeReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      ) : (
        <>
          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {renderTabContent()}
          </View>

          {/* Bottom Navigation Bar */}
          <View style={styles.bottomNav}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabIcon,
                  activeTab === tab.id && styles.activeTabIcon,
                ]}>
                  {tab.icon}
                </Text>
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.activeTabLabel,
                ]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
    textAlign: 'center',
  },
  contentText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 8,
    minHeight: 80,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeTabButton: {
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  activeTabIcon: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportsSection: {
    marginTop: 30,
    width: '100%',
    maxWidth: 400,
    flex: 1,
    minHeight: 400,
  },
  reportsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
    textAlign: 'center',
  },
  reportsTabContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    paddingTop: 20,
  },
  crimeListTabContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    paddingTop: 20,
  },
  crimeListSection: {
    marginTop: 30,
    width: '100%',
    maxWidth: 400,
    flex: 1,
    minHeight: 400,
  },
  crimeListSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default Dashboard;

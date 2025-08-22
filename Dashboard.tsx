import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import { auth } from './firebaseConfig';
import { useTheme, colors } from './services/themeContext';
import { FirebaseService } from './services/firebaseService';
import CrimeReportForm from './CrimeReportForm';
import CrimeReportsList from './CrimeReportsList';
import CrimeReportDetail from './CrimeReportDetail';
import CrimeListFromOthers from './CrimeListFromOthers';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const Dashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState(2);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;

  useEffect(() => {
    if (activeTab === 4) {
      loadUserProfile();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await FirebaseService.getCivilianUser(currentUser.uid);
      if (userData) {
        setUserProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const getInitials = () => {
    if (!userProfile) return '';
    return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
  };

  const tabs = [
    { id: 0, name: 'Crime List', icon: require('./assets/reports.png') },
    { id: 1, name: 'Contacts', icon: require('./assets/contacts.png') },
    { id: 2, name: 'SOS', icon: require('./assets/SOS.png') },
    { id: 3, name: 'Report', icon: require('./assets/WriteR.png') },
    { id: 4, name: 'Profile', icon: require('./assets/Profile.png') },
  ];

  const handleTabPress = (tabId: number) => {
    setActiveTab(tabId);
  };

  const styles = StyleSheet.create({
    profileScrollView: {
      flex: 1,
      backgroundColor: theme.background,
    },
    profileContainer: {
      flex: 1,
      padding: 20,
    },

    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: theme.background,
      fontSize: 36,
      fontWeight: 'bold',
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    userEmail: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: 'center',
      marginBottom: 16,
    },

    settingsContainer: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.secondaryText,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.settingsBackground,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuItemText: {
      fontSize: 16,
      color: theme.text,
    },
    chevronRight: {
      fontSize: 20,
      color: theme.secondaryText,
    },
    themeSwitch: {
      transform: [{ scale: 1.2 }],
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    contentText: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: theme.primary,
      borderTopWidth: 1,
      borderTopColor: theme.border,
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
      backgroundColor: isDarkMode ? 'rgba(147, 197, 253, 0.5)' : 'rgba(37, 99, 235, 0.8)',
    },
    tabIcon: {
      fontSize: 24,
      marginBottom: 4,
      color: theme.background,
    },
    tabIconImage: {
      width: 32,
      height: 32,
      marginBottom: 4,
      tintColor: theme.background,
      resizeMode: 'contain',
    },
    sosIconImage: {
      width: 48,
      height: 48,
      marginBottom: 4,
      resizeMode: 'contain',
      transform: [{ scale: 1.2 }],
    },
    activeTabIcon: {
      transform: [{ scale: 1.1 }],
    },
    tabLabel: {
      fontSize: 12,
      color: theme.background,
      fontWeight: '500',
      opacity: 0.8,
    },
    activeTabLabel: {
      color: theme.background,
      fontWeight: '600',
      opacity: 1,
    },
    logoutButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    logoutButton: {
      backgroundColor: '#FF0000',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      width: '60%',
      alignSelf: 'center',
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    logoutIcon: {
      width: 24,
      height: 24,
      tintColor: '#FFFFFF',
    },
    reportButton: {
      backgroundColor: '#D21414',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
      marginBottom: 20,
      width: '60%',
      alignSelf: 'center',
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
      color: theme.primary,
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
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
  });

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
            <Text style={styles.contentTitle}>Emergency Contacts</Text>
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
          <ScrollView 
            style={styles.profileScrollView}
            showsVerticalScrollIndicator={false}>
            <View style={styles.profileContainer}>


              {/* Profile Info */}
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userProfile ? getInitials() : 'JD'}</Text>
              </View>
              <Text style={styles.userName}>
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'John Doe'}
              </Text>
              <Text style={styles.userEmail}>
                {userProfile?.email || 'JohnDoe@gmail.com'}
              </Text>


              {/* Settings Menu */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Change Password</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Help Center</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Notifications</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Dark Mode</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={isDarkMode ? '#1E3A8A' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleTheme}
                    value={isDarkMode}
                    style={styles.themeSwitch}
                  />
                </View>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Fonts</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>


                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Language</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Terms of Services</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Privacy and Policies</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Give Us Feedbacks</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                {/* Logout Button */}
                {onLogout && (
                  <TouchableOpacity
                    style={styles.logoutButtonContainer}
                    onPress={onLogout}
                    activeOpacity={0.7}
                  >
                    <View style={styles.logoutButton}>
                      <Image 
                        source={require('./assets/logout.png')} 
                        style={styles.logoutIcon}
                      />
                      <Text style={styles.logoutButtonText}>Logout</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.primary} />
      
      {showCrimeReportForm ? (
        <CrimeReportForm
          onClose={() => setShowCrimeReportForm(false)}
          onSuccess={() => {
            setShowCrimeReportForm(false);
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
                {typeof tab.icon === 'string' ? (
                  <Text style={[
                    styles.tabIcon,
                    activeTab === tab.id && styles.activeTabIcon,
                  ]}>
                    {tab.icon}
                  </Text>
                ) : (
                  <Image
                    source={tab.icon}
                    style={[
                      tab.id === 2 ? styles.sosIconImage : styles.tabIconImage,
                      activeTab === tab.id && styles.activeTabIcon,
                    ]}
                  />
                )}
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

export default Dashboard;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { EmergencyContact, CreateEmergencyContactData, UpdateEmergencyContactData } from '../../services/types/emergency-types';
import { EmergencyContactsService } from '../../services/emergencyContactsService';
import EmergencyContactForm from '../emergency-contact-form';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { createStyles } from './styles';

interface EmergencyContactsListProps {
  userId: string;
}

const EmergencyContactsList: React.FC<EmergencyContactsListProps> = ({ userId }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, fontSize } = useTheme();
  const { language, t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme);

  useEffect(() => {
    if (userId) {
      loadContacts();
    } else {
      setError('User ID not available');
      setLoading(false);
    }
  }, [userId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading emergency contacts for user:', userId);
      const contactsData = await EmergencyContactsService.getUserEmergencyContacts(userId);
      console.log('Loaded contacts:', contactsData);
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError(error.message || 'Failed to load emergency contacts');
      setContacts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  const handleLongPress = (contact: EmergencyContact) => {
    setSelectedContact(contact);
    setShowActionMenu(true);
  };

  const handleEditContact = () => {
    if (selectedContact) {
      setEditingContact(selectedContact);
      setShowForm(true);
      setShowActionMenu(false);
      setSelectedContact(null);
    }
  };


  const handleDeleteContact = () => {
    if (selectedContact) {
      Alert.alert(
        t('emergency.deleteContact'),
        `${t('emergency.deleteConfirm')} ${selectedContact.name}?`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('emergency.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await EmergencyContactsService.deleteEmergencyContact(userId, selectedContact.id);
                await loadContacts();
                Alert.alert(t('common.success'), t('emergency.deleteSuccess'));
                setShowActionMenu(false);
                setSelectedContact(null);
              } catch (error) {
                console.error('Error deleting contact:', error);
                Alert.alert(t('common.error'), t('emergency.deleteError'));
              }
            },
          },
        ]
      );
    }
  };

  const closeActionMenu = () => {
    setShowActionMenu(false);
    setSelectedContact(null);
  };

  const handleSaveContact = async (contactData: CreateEmergencyContactData | UpdateEmergencyContactData) => {
    try {
      setFormLoading(true);
      
      if (editingContact) {
        // Update existing contact
        await EmergencyContactsService.updateEmergencyContact(
          userId,
          editingContact.id,
          contactData as UpdateEmergencyContactData
        );
      } else {
        // Add new contact
        await EmergencyContactsService.addEmergencyContact(
          userId,
          contactData as CreateEmergencyContactData
        );
      }
      
      await loadContacts();
      setShowForm(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };


  const renderContactItem = ({ item }: { item: EmergencyContact }) => (
    <TouchableOpacity 
      style={[styles.contactItem, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={[styles.contactName, { color: theme.text, fontSize: fonts.body }]}>{item.name}</Text>
          {item.isPrimary && (
            <View style={[styles.primaryBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.primaryBadgeText}>{t('emergency.primary')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.contactPhone, { color: theme.primary, fontSize: fonts.caption }]}>{item.phoneNumber}</Text>
        <Text style={[styles.contactRelationship, { color: theme.secondaryText, fontSize: fonts.caption }]}>{item.relationship}</Text>
      </View>
      <View style={styles.longPressHint}>
        <Text style={[styles.longPressHintText, { color: theme.secondaryText, fontSize: fonts.caption }]}>
          {t('emergency.longPressHint')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateTitle, { color: theme.text, fontSize: fonts.title }]}>{t('emergency.noContacts')}</Text>
      <Text style={[styles.emptyStateText, { color: theme.secondaryText, fontSize: fonts.body }]}>
        {t('emergency.noContactsDesc')}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateTitle, { color: theme.text, fontSize: fonts.title }]}>{t('emergency.loadError')}</Text>
      <Text style={[styles.emptyStateText, { color: theme.secondaryText, fontSize: fonts.body }]}>
        {error}
      </Text>
      <TouchableOpacity style={[styles.addFirstButton, { backgroundColor: theme.primary }]} onPress={loadContacts}>
        <Text style={[styles.addFirstButtonText, { fontSize: fonts.body }]}>{t('common.tryAgain')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondaryText, fontSize: fonts.body }]}>{t('emergency.loading')}</Text>
      </View>
    );
  }

  // If no userId, show error
  if (!userId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyStateTitle, { color: theme.text, fontSize: fonts.title }]}>{t('emergency.authRequired')}</Text>
        <Text style={[styles.emptyStateText, { color: theme.secondaryText, fontSize: fonts.body }]}>
          {t('emergency.authRequiredDesc')}
        </Text>
      </View>
    );
  }

  // Calculate primary contacts count
  const primaryContactsCount = contacts.filter(contact => contact.isPrimary).length;
  const maxPrimaryContacts = 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontSize: fonts.subtitle }]}>{t('emergency.title')}</Text>
        <Text style={[
          styles.primaryCounter, 
          { 
            color: primaryContactsCount >= maxPrimaryContacts ? '#FF4444' : theme.secondaryText, 
            fontSize: fonts.caption 
          }
        ]}>
          Primary contacts: {primaryContactsCount}/{maxPrimaryContacts}
          {primaryContactsCount >= maxPrimaryContacts && ' (Limit reached)'}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          renderErrorState()
        ) : contacts.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false} // Disable FlatList scroll since we're using ScrollView
          />
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingAddButton, { backgroundColor: theme.primary }]}
        onPress={handleAddContact}
        activeOpacity={0.8}
      >
        <Text style={[styles.floatingAddButtonText, { color: '#FFFFFF' }]}>+</Text>
      </TouchableOpacity>


      <EmergencyContactForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        editingContact={editingContact}
        isLoading={formLoading}
      />

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeActionMenu}
        >
          <View style={[styles.actionMenu, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}>
            <Text style={[styles.actionMenuTitle, { color: theme.text, fontSize: fonts.subtitle }]}>
              {selectedContact?.name}
            </Text>
            <View style={styles.actionMenuButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={handleEditContact}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontSize: fonts.body }]}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={handleDeleteContact}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontSize: fonts.body }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={closeActionMenu}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text, fontSize: fonts.body }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default EmergencyContactsList;

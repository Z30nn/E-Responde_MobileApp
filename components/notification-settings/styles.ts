import { StyleSheet } from 'react-native';
import { ThemeColors, FontSizes } from '../../services/themeContext';

export const createStyles = (theme: ThemeColors, fonts: FontSizes) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: fonts.title + 6,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: fonts.body,
    lineHeight: 22,
    color: theme.secondaryText,
  },
  section: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: theme.menuBackground,
  },
  sectionTitle: {
    fontSize: fonts.subtitle,
    fontWeight: '600',
    marginBottom: 16,
    color: theme.text,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: fonts.body,
    fontWeight: '500',
    marginBottom: 4,
    color: theme.text,
  },
  settingDescription: {
    fontSize: fonts.caption,
    lineHeight: 18,
    color: theme.secondaryText,
  },
  quietHoursButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quietHoursButtonText: {
    fontSize: fonts.caption,
    fontWeight: '500',
    color: theme.primary,
  },
  loadingText: {
    fontSize: fonts.body,
    textAlign: 'center',
    marginTop: 50,
    color: theme.secondaryText,
  },
  errorText: {
    fontSize: fonts.body,
    textAlign: 'center',
    marginTop: 50,
    color: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: theme.menuBackground,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.text,
  },
  timeInputContainer: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.text,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.menuBackground,
    color: theme.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: theme.border,
  },
  saveButton: {
    backgroundColor: theme.primary,
  },
  cancelButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: theme.background,
    fontSize: 16,
    fontWeight: '500',
  },
});

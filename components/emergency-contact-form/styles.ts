import { StyleSheet } from 'react-native';

export const createStyles = (theme: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    minHeight: 400,
    borderRadius: 16,
    backgroundColor: theme.background,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  container: {
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.menuBackground,
    minHeight: 60, // Ensure minimum height for large fonts
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40, // Ensure minimum touch target
  },
  cancelButtonText: {
    color: theme.primary,
    fontWeight: '500',
  },
  title: {
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#3b5b8a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    minHeight: 40, // Ensure minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: theme.background,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.text,
    backgroundColor: theme.menuBackground,
    minHeight: 48, // Ensure minimum height for large fonts
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start' for better large font support
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 20,
    minHeight: 60, // Ensure minimum height for large fonts
  },
  switchContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  switchDescription: {
    color: theme.secondaryText,
    lineHeight: 20,
  },
});

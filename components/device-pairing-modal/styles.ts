import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const createStyles = (theme: any, fonts: any, isDarkMode: boolean) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  modalTitle: {
    fontSize: fonts.h2,
    fontWeight: 'bold',
    color: theme.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.text,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: fonts.body,
    color: theme.textSecondary,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: fonts.caption,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  deviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceDetail: {
    fontSize: fonts.caption,
    color: theme.textSecondary,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairButton: {
    backgroundColor: theme.primary,
  },
  unpairButton: {
    backgroundColor: theme.error,
  },
  processingButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: fonts.caption,
    fontWeight: '600',
  },
  pairButtonText: {
    color: theme.surface,
  },
  unpairButtonText: {
    color: theme.surface,
  },
  emptyState: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyStateText: {
    fontSize: fonts.body,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: fonts.caption,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

import { StyleSheet } from 'react-native';
import { ThemeColors, FontSizes } from '../../services/themeContext';

export const createStyles = (theme: ThemeColors, fonts: FontSizes) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: fonts.body,
    color: theme.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: fonts.title + 6,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: fonts.body,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  notificationItem: {
    backgroundColor: theme.cardBackground,
    marginHorizontal: 0,
    marginVertical: 2,
    borderRadius: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.iconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notificationIcon: {
    fontSize: fonts.subtitle + 4,
    color: theme.iconColor,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationBody: {
    fontSize: fonts.caption,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  notificationTime: {
    fontSize: fonts.caption - 2,
    color: theme.textSecondary,
    fontWeight: '400',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  // SOS Alert specific styles
  sosNotificationItem: {
    backgroundColor: theme.cardBackground,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  sosIconContainer: {
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#FF6666',
  },
  sosIcon: {
    color: '#FFFFFF',
    fontSize: fonts.subtitle + 6,
  },
  sosBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF4444',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sosTitle: {
    color: '#FF4444',
    fontWeight: '700',
  },
  sosTime: {
    color: '#FF4444',
    fontWeight: '600',
  },
  sosBody: {
    color: theme.text,
    fontWeight: '500',
  },
  // Mark All as Read button styles
  markAllContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    zIndex: 1000,
    elevation: 10,
  },
  markAllButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 44, // Ensure minimum touch target size
  },
  markAllButtonText: {
    color: '#FFFFFF',
    fontSize: fonts.body,
    fontWeight: '600',
  },
  // Action buttons for primary contact requests
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: fonts.caption,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#FFFFFF',
    fontSize: fonts.caption,
    fontWeight: '600',
  },
  longPressHint: {
    marginTop: 8,
    fontSize: fonts.caption - 2,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

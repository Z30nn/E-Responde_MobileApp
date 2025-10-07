import { StyleSheet } from 'react-native';

export const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 0,
    position: 'relative',
    // Ensure container doesn't change size unexpectedly
    minHeight: '100%',
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.menuBackground,
    marginTop: 40,
  },
  title: {
    fontWeight: '700',
    color: theme.text,
  },
  primaryCounter: {
    marginTop: 4,
    opacity: 0.7,
  },
  addButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: theme.background,
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  contactItem: {
    backgroundColor: theme.menuBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  primaryBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  primaryBadgeText: {
    color: theme.background,
    fontSize: 9,
    fontWeight: '600',
  },
  contactPhone: {
    color: theme.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  contactRelationship: {
    color: theme.secondaryText,
  },
  longPressHint: {
    marginTop: 8,
    alignItems: 'center',
  },
  longPressHintText: {
    color: theme.secondaryText,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: theme.menuBackground,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    minWidth: 280,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: theme.text,
  },
  actionMenuButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.background,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100, // Add extra padding at bottom
  },
  emptyStateTitle: {
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: theme.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFirstButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 48, // Ensure minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFirstButtonText: {
    color: theme.background,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.secondaryText,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 60, // Fixed distance from bottom of screen
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    zIndex: 10000,
    // Ensure it stays fixed regardless of content changes
    top: undefined,
    left: undefined,
  },
  floatingAddButtonText: {
    color: theme.background,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },
});

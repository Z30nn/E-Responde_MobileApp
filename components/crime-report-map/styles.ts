import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../services/themeContext';

export const styles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: theme.menuBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
  },
  headerSpacer: {
    width: 60,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomInfo: {
    backgroundColor: theme.menuBackground,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  crimeInfo: {
    marginBottom: 16,
  },
  crimeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 8,
  },
  crimeInfoText: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 4,
  },
  policeInfo: {
    marginTop: 16,
  },
  policeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 12,
  },
  policeOfficer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  officerLeftInfo: {
    flex: 1,
  },
  officerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  officerBadge: {
    fontSize: 12,
    color: theme.secondaryText,
    marginTop: 2,
  },
  officerRightInfo: {
    alignItems: 'flex-end',
  },
  officerDistance: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  officerEta: {
    fontSize: 12,
    color: theme.secondaryText,
    marginTop: 2,
  },
  noOfficerText: {
    fontSize: 14,
    color: theme.secondaryText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.secondaryText,
  },
  policeCarMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  policeCarMarkerText: {
    fontSize: 20,
  },
  crimeMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  crimeMarkerText: {
    fontSize: 20,
  },
});

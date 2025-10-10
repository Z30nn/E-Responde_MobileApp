import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d3480',
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#475e3d',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4c643b',
    textAlign: 'center',
    marginBottom: 20,
  },
  subDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#4c643b',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#4c643b',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#4c643b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerLink: {
    marginTop: 20,
  },
  footerLinkText: {
    color: '#4c643b',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

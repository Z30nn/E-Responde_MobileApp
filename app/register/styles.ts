import { StyleSheet } from 'react-native';

export const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d3480',
    marginTop: -50,
    marginBottom: -50,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 0,
    paddingBottom: 50,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 25,
    marginTop: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 94, 61, 0.1)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#475e3d',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  formFields: {
    gap: 18,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    borderRadius: 25,
    color: '#1F2937',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 14,
    borderRadius: 25,
    color: '#1F2937',
  },
  eyeButton: {
    position: 'absolute',
    right: 5,
    top: -5,
    padding: 5,
  },
  eyeIcon: {
    width: 50,
    height: 50,
    tintColor: '#193a3c',
  },
  registerButton: {
    backgroundColor: '#4c643b',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  registerButtonText: {
    color: '#f8f9ed',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#f8f9ed',
    fontSize: 16,
  },
  footerLink: {
    color: '#f8f9ed',
    fontWeight: 'bold',
  },
  passwordPolicyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: -8,
  },
  passwordPolicyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordPolicyItem: {
    fontSize: 12,
    marginBottom: 4,
    paddingLeft: 4,
  },
  passwordPolicyValid: {
    color: '#059669',
    fontWeight: '500',
  },
  passwordPolicyInvalid: {
    color: '#DC2626',
    fontWeight: '500',
  },
  passwordMatchContainer: {
    marginTop: -8,
    paddingHorizontal: 4,
  },
  passwordMatchValid: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  passwordMatchInvalid: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
});


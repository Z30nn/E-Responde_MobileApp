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
    paddingTop: 30,
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
  forgotPasswordText: {
    color: '#475e3d',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: -5,
    fontSize: 14,
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
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
});


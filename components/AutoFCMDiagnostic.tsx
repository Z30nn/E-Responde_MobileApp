import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../services/authContext';
import { runAutoFCMDiagnostic, quickFCMCheck } from '../auto-fcm-diagnostic';

const AutoFCMDiagnostic = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const runDiagnostic = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    addLog('🔍 Starting FCM Diagnostic...');

    try {
      const diagnosticResults = await runAutoFCMDiagnostic(user.uid);
      setResults(diagnosticResults);
      
      if (diagnosticResults.issues.length === 0) {
        addLog('🎉 All tests passed! FCM should be working correctly.');
        Alert.alert(
          'FCM Diagnostic Complete',
          '✅ All FCM tests passed!\n\nFCM should be working correctly.\n\nIf you still don\'t receive notifications:\n1. Close the app completely\n2. Wait 15-30 seconds\n3. Check system tray for notification\n\nIf no notification appears, check device settings:\n• Settings > Apps > E-Responde > Notifications > Allow\n• Settings > Battery > Battery Optimization > E-Responde > Don\'t optimize'
        );
      } else {
        addLog(`❌ Found ${diagnosticResults.issues.length} issues:`);
        diagnosticResults.issues.forEach((issue, index) => {
          addLog(`${index + 1}. ${issue}`);
        });
        
        addLog('🔧 Solutions:');
        diagnosticResults.solutions.forEach((solution, index) => {
          addLog(`${index + 1}. ${solution}`);
        });
        
        Alert.alert(
          'FCM Issues Found',
          `Found ${diagnosticResults.issues.length} issues:\n\n${diagnosticResults.issues.join('\n')}\n\nSolutions:\n${diagnosticResults.solutions.slice(0, 3).join('\n')}`
        );
      }
    } catch (error) {
      addLog(`❌ Diagnostic error: ${error.message || error}`);
      Alert.alert('FCM Diagnostic Error', `Error running diagnostic: ${error.message || error}`);
    }
    
    setIsRunning(false);
  };

  const runQuickCheck = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Running Quick FCM Check...');

    try {
      const result = await quickFCMCheck(user.uid);
      
      if (result.success) {
        addLog('✅ Quick check passed!');
        Alert.alert(
          'FCM Quick Check',
          '✅ FCM is working correctly!\n\nTest notification sent.\n\nNow:\n1. Close the app completely\n2. Wait 15-30 seconds\n3. Check system tray for notification'
        );
      } else {
        addLog(`❌ Quick check failed: ${result.issue}`);
        Alert.alert('FCM Quick Check Failed', `Issue found: ${result.issue}`);
      }
    } catch (error) {
      addLog(`❌ Quick check error: ${error.message || error}`);
      Alert.alert('FCM Quick Check Error', `Error: ${error.message || error}`);
    }
    
    setIsRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
    setResults(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auto FCM Diagnostic</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runDiagnostic}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Diagnostic...' : 'Run Full FCM Diagnostic'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={runQuickCheck}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Quick FCM Check'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearLogs}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
      
      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Diagnostic Results:</Text>
          <Text style={styles.resultText}>FCM Token: {results.fcmToken ? '✅' : '❌'}</Text>
          <Text style={styles.resultText}>Permissions: {results.permissions ? '✅' : '❌'}</Text>
          <Text style={styles.resultText}>Token Storage: {results.tokenStorage ? '✅' : '❌'}</Text>
          <Text style={styles.resultText}>Background Handler: {results.backgroundHandler ? '✅' : '❌'}</Text>
          <Text style={styles.resultText}>Test Notification: {results.testNotification ? '✅' : '❌'}</Text>
        </View>
      )}
      
      <ScrollView style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Diagnostic Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default AutoFCMDiagnostic;

/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Login from './Login';
import Register from './Register';

const Welcome = () => {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'login' | 'register'>('welcome');

  if (currentScreen === 'login') {
    return <Login />;
  }

  if (currentScreen === 'register') {
    return <Register onGoToLogin={() => setCurrentScreen('login')} />;
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-start',
        padding: 20,
      }}>
      <Image
        source={require('./assets/welcome.png')}
        style={{
          width: '80%',
          height: 600,
          resizeMode: 'contain',
          alignSelf: 'center',
          marginBottom: 20,
        }}
      />

      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E3A8A',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: -160,
      }}>
        Join now.
      </Text>

      <Text style={{
        fontSize: 16,
        color: '#000000',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
      }}>
        You are one click away from making your community safer.
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: '#1E3A8A',
          borderRadius: 8,
          padding: 15,
          alignItems: 'center',
          width: '70%',
          alignSelf: 'center',
          marginBottom: 15,
        }}
        onPress={() => setCurrentScreen('register')}
      >
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          Sign up
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#000000',
          borderRadius: 8,
          padding: 15,
          alignItems: 'center',
          width: '70%',
          alignSelf: 'center',
        }}
        onPress={() => setCurrentScreen('login')}
      >
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          Log in
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Welcome;

/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Login from './app/login';
import Register from './app/register';

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
        backgroundColor: '#eef2f1',
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
      }}>
      <View style={{
        alignItems: 'center',
        marginBottom: 40,
      }}>
        <Image
          source={require('./assets/landingpng.png')}
          style={{
            width: '90%',
            height: 300,
            resizeMode: 'contain',
            marginBottom: 15,
          }}
        />

        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#193a3c',
          textAlign: 'center',
          marginBottom: -5,
        }}>
          Join now.
        </Text>

        <Text style={{
          fontSize: 16,
          color: '#666666',
          textAlign: 'center',
          paddingHorizontal: 20,
          lineHeight: 24,
          marginBottom: 5,
        }}>
          You are one click away from making your community safer.
        </Text>
      </View>

      <View style={{
        alignItems: 'center',
        gap: 15,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#0d3b66',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 24,
            alignItems: 'center',
            width: '100%',
            maxWidth: 250,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={() => setCurrentScreen('register')}
        >
          <Text style={{ 
            color: '#f8f9ed', 
            fontSize: 18, 
            fontWeight: '600',
            letterSpacing: 0.5,
            textAlign: 'center',
          }}>
            Sign up
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#4c643b',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 24,
            alignItems: 'center',
            width: '100%',
            maxWidth: 250,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={() => setCurrentScreen('login')}
        >
          <Text style={{ 
            color: '#f8f9ed', 
            fontSize: 18, 
            fontWeight: '600',
            letterSpacing: 0.5,
            textAlign: 'center',
          }}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Welcome;

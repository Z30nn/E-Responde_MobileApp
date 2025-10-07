import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';
type FontSizeType = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
  fontSize: FontSizeType;
  setFontSize: (size: FontSizeType) => void;
  setCurrentUserId: (userId: string | null) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDarkMode: false,
  toggleTheme: () => {},
  fontSize: 'medium',
  setFontSize: () => {},
  setCurrentUserId: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [fontSize, setFontSizeState] = useState<FontSizeType>('medium');
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);

  const setCurrentUserId = (userId: string | null) => {
    setCurrentUserIdState(userId);
    if (userId) {
      loadTheme(userId);
      loadFontSize(userId);
    }
    // Don't reset to defaults when user logs out - keep current settings
  };

  const loadTheme = async (userId: string) => {
    try {
      const savedTheme = await AsyncStorage.getItem(`theme_${userId}`);
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const loadFontSize = async (userId: string) => {
    try {
      const savedFontSize = await AsyncStorage.getItem(`fontSize_${userId}`);
      if (savedFontSize) {
        setFontSizeState(savedFontSize as FontSizeType);
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    }
  };

  const toggleTheme = async () => {
    if (!currentUserId) return;
    
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(`theme_${currentUserId}`, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setFontSize = async (newFontSize: FontSizeType) => {
    if (!currentUserId) return;
    
    setFontSizeState(newFontSize);
    try {
      await AsyncStorage.setItem(`fontSize_${currentUserId}`, newFontSize);
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode: theme === 'dark',
        toggleTheme,
        fontSize,
        setFontSize,
        setCurrentUserId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const colors = {
  light: {
    primary: '#2d3480',
    background: '#FFFFFF',
    text: '#1F2937',
    secondaryText: '#666666',
    textSecondary: '#666666', // Alias for compatibility
    placeholder: '#9CA3AF',
    border: '#E5E7EB',
    menuBackground: '#F8F9FA',
    settingsBackground: '#F3F4F6',
    cardBackground: '#FFFFFF',
    iconBackground: '#F3F4F6',
    iconColor: '#6B7280',
  },
  dark: {
    primary: '#2d3480',
    background: '#1A1A1A',
    text: '#E5E5E5',
    secondaryText: '#B0B0B0',
    textSecondary: '#B0B0B0', // Alias for compatibility
    placeholder: '#808080',
    border: '#404040',
    menuBackground: '#2A2A2A',
    settingsBackground: '#333333',
    cardBackground: '#2A2A2A',
    iconBackground: '#404040',
    iconColor: '#B0B0B0',
  },
};

export const fontSizes = {
  small: {
    title: 18,
    subtitle: 16,
    body: 14,
    caption: 12,
    button: 14,
    input: 14,
    label: 14,
  },
  medium: {
    title: 22,
    subtitle: 18,
    body: 16,
    caption: 14,
    button: 16,
    input: 16,
    label: 16,
  },
  large: {
    title: 26,
    subtitle: 20,
    body: 18,
    caption: 16,
    button: 18,
    input: 18,
    label: 18,
  },
};

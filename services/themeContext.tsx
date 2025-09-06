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
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDarkMode: false,
  toggleTheme: () => {},
  fontSize: 'medium',
  setFontSize: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [fontSize, setFontSizeState] = useState<FontSizeType>('medium');

  useEffect(() => {
    loadTheme();
    loadFontSize();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const loadFontSize = async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      if (savedFontSize) {
        setFontSizeState(savedFontSize as FontSizeType);
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setFontSize = async (newFontSize: FontSizeType) => {
    setFontSizeState(newFontSize);
    try {
      await AsyncStorage.setItem('fontSize', newFontSize);
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const colors = {
  light: {
    primary: '#1E3A8A',
    background: '#FFFFFF',
    text: '#1F2937',
    secondaryText: '#666666',
    placeholder: '#9CA3AF',
    border: '#E5E7EB',
    menuBackground: '#FFFFFF',
    settingsBackground: '#F3F4F6',
  },
  dark: {
    primary: '#60A5FA',
    background: '#111827',
    text: '#F3F4F6',
    secondaryText: '#9CA3AF',
    placeholder: '#FFFFFF',
    border: '#374151',
    menuBackground: '#1F2937',
    settingsBackground: '#374151',
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

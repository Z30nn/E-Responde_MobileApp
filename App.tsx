import React from 'react';
import Splash from './Splash';
import { ThemeProvider } from './services/themeContext';
import { LanguageProvider } from './services/languageContext';

const App = () => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Splash />
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App; 
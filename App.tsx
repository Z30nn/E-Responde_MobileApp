import React from 'react';
import Splash from './Splash';
import { ThemeProvider } from './services/themeContext';

const App = () => {
  return (
    <ThemeProvider>
      <Splash />
    </ThemeProvider>
  );
};

export default App; 
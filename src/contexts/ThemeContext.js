import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('client_theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const saveTheme = useCallback(async (theme) => {
    try {
      await AsyncStorage.setItem('client_theme', theme);
    } catch {
      // no-op
    }
  }, []);

  const setThemeMode = useCallback(
    (dark) => {
      setIsDarkMode(Boolean(dark));
      saveTheme(dark ? 'dark' : 'light');
    },
    [saveTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeMode(!isDarkMode);
  }, [isDarkMode, setThemeMode]);

  const value = useMemo(
    () => ({
      isDarkMode,
      toggleTheme,
      setThemeMode,
    }),
    [isDarkMode, toggleTheme, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

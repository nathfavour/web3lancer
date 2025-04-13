'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useState, useEffect, ReactNode } from 'react';

// Define light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3B82F6', // Blue
      light: '#60A5FA',
      dark: '#1E40AF',
    },
    secondary: {
      main: '#8B5CF6', // Purple
      light: '#A78BFA',
      dark: '#6D28D9',
    },
    background: {
      default: '#f8f9fa',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

// Define dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA', // Lighter blue for dark mode
      light: '#93C5FD',
      dark: '#2563EB',
    },
    secondary: {
      main: '#A78BFA', // Lighter purple for dark mode
      light: '#C4B5FD',
      dark: '#7C3AED',
    },
    background: {
      default: '#111827',
      paper: '#1F2937',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

interface ThemeProviderProps {
  children: ReactNode;
  );
}

// This component adapts next-themes to MUI
function ColorModeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const { theme } = useTheme();

  useEffect(() => {
    setCurrentTheme(theme === 'dark' ? darkTheme : lightTheme);
  }, [theme]);

  return (
    <MUIThemeProvider theme={currentTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

// Export a hook to use the theme
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  return { 
    theme, 
    setTheme, 
    resolvedTheme,
    systemTheme,
    toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    isDarkMode: resolvedTheme === 'dark' 
  };
}
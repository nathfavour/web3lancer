"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { PaletteMode } from '@mui/material';

// Define theme type
type ThemeContextType = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

// Create context
export const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

// Custom hook to use theme
export const useThemeContext = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage or default to light
  const [mode, setMode] = useState<PaletteMode>('light');

  useEffect(() => {
    // Check for saved theme preference
    const savedMode = localStorage.getItem('themeMode') as PaletteMode | null;
    
    // Check for system preference if no saved preference
    if (!savedMode) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDarkMode ? 'dark' : 'light');
    } else {
      setMode(savedMode);
    }

    // Apply theme class to document for global CSS styling
    document.documentElement.setAttribute('data-theme', mode);
  }, []);

  useEffect(() => {
    // Update data-theme attribute when mode changes
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = React.useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode]
  );

  // Create theme
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode palette
                primary: {
                  main: '#1E40AF',
                  light: '#3B82F6',
                  dark: '#1E3A8A',
                },
                secondary: {
                  main: '#8B5CF6',
                  light: '#A78BFA',
                  dark: '#6D28D9',
                },
                background: {
                  default: '#F9FAFB',
                  paper: '#FFFFFF',
                },
                text: {
                  primary: '#111827',
                  secondary: '#4B5563',
                },
              }
            : {
                // Dark mode palette
                primary: {
                  main: '#3B82F6',
                  light: '#60A5FA',
                  dark: '#1E40AF',
                },
                secondary: {
                  main: '#8B5CF6',
                  light: '#A78BFA',
                  dark: '#6D28D9',
                },
                background: {
                  default: '#111827',
                  paper: '#1F2937',
                },
                text: {
                  primary: '#F9FAFB',
                  secondary: '#D1D5DB',
                },
              }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '5px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: mode === 'light' 
                    ? 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)'
                    : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                  borderRadius: '5px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: mode === 'light'
                    ? 'linear-gradient(135deg, #1E40AF 20%, #3B82F6 100%)'
                    : 'linear-gradient(135deg, #3B82F6 20%, #60A5FA 100%)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: mode === 'light' 
                  ? 'rgba(30, 58, 138, 0.9)'
                  : 'rgba(17, 24, 39, 0.9)',
                backdropFilter: 'blur(10px)',
              },
            },
          },
          MuiCard: {
            defaultProps: {
              elevation: 0,
            },
            styleOverrides: {
              root: {
                borderRadius: '12px',
                backgroundImage: 'none',
              },
            },
          },
          MuiPaper: {
            defaultProps: {
              elevation: 0,
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={colorMode}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}
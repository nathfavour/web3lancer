'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { account, validateSession } from '@/utils/api';

interface User {
  $id: string;
  name?: string;
  email?: string;
  emailVerification?: boolean;
  provider?: string;
  providerUid?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  profilePicture: string | null;
  setUser: (user: User | null) => void;
  setIsAnonymous: (isAnonymous: boolean) => void;
  setProfilePicture: (url: string | null) => void;
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<boolean>;
}

// Create a context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAnonymous: false,
  profilePicture: null,
  setUser: () => {},
  setIsAnonymous: () => {},
  setProfilePicture: () => {},
  refreshUser: async () => null,
  signOut: async () => false,
});

// Provider component that wraps the app
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Function to refresh the user data from Appwrite
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      setIsLoading(true);
      const currentUser = await account.get();
      setUser(currentUser);
      setIsAnonymous(!!currentUser?.$id && currentUser?.status === false);
      return currentUser;
    } catch (error) {
      console.log('No active session found');
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to handle sign out
  const handleSignOut = useCallback(async (): Promise<boolean> => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setProfilePicture(null);
      setIsAnonymous(false);
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }, []);

  // Effect to check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const isValid = await validateSession();
        
        if (isValid) {
          await refreshUser();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  // Wrap state and functions to prevent serialization issues
  const contextValue = {
    user,
    isLoading,
    isAnonymous,
    profilePicture,
    setUser,
    setIsAnonymous,
    setProfilePicture,
    refreshUser,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

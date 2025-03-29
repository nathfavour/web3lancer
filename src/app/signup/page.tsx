'use client';

import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Alert, Button, Divider, TextField, IconButton, Tabs, Tab } from '@mui/material';
import { GitHub, Email } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ConnectWallet } from '@/components/ConnectWallet';
import { signUp, convertAnonymousSession } from '@/utils/api';
import Link from 'next/link';
import { useMultiAccount } from '@/contexts/MultiAccountContext';
import { useAuth } from '@/contexts/AuthContext';
import EmailOTPForm from '@/components/EmailOTPForm';

export default function SignUpPage() {
  const router = useRouter();
  const { addAccount, hasMaxAccounts } = useMultiAccount();
  const { isAnonymous, setIsAnonymous } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'email' | 'otp'>('email');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (hasMaxAccounts) {
      setError('Maximum number of accounts (3) reached. Please remove an account before adding a new one.');
      setIsLoading(false);
      return;
    }

    try {
      let response;

      // If user has an anonymous session, convert it instead of creating new account
      if (isAnonymous) {
        response = await convertAnonymousSession(formData.email, formData.password, formData.name);
        setIsAnonymous(false);
      } else {
        // Regular signup flow
        response = await signUp(formData.email, formData.password, formData.name);
      }

      if (response) {
        // Add the new account to multi-accounts
        try {
          addAccount({
            $id: response.$id,
            name: response.name || '',
            email: response.email || '',
            isActive: true
          });
        } catch (error) {
          console.error('Error adding account:', error);
        }

        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setError('Failed to create account. Email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub sign up
  const handleGitHubSignUp = () => {
    if (hasMaxAccounts) {
      setError('Maximum number of accounts (3) reached. Please remove an account before adding a new one.');
      return;
    }
    // Redirect to GitHub OAuth flow
    window.location.href = '/api/auth/github';
  };

  return (
    <Box sx={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      p: { xs: 2, sm: 4 },
      pt: { xs: '80px', sm: '100px' },
      background: 'linear-gradient(135deg, #f6f7f9 0%, #ffffff 100%)',
    }}>
      <Paper sx={{ 
        maxWidth: 480,
        width: '100%',
        p: { xs: 3, sm: 4 },
        borderRadius: 2,
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
      }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Create Account
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign up to get started with Web3Lancer
        </Typography>
        
        {/* Sign up method selector */}
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={signupMethod} 
            onChange={(_, value) => setSignupMethod(value)}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="Email/Password" value="email" />
            <Tab label="Email OTP" value="otp" />
          </Tabs>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Email/Password form */}
        {signupMethod === 'email' && (
          <form onSubmit={handleSignUp}>
            <TextField
              label="Name"
              name="name"
              fullWidth
              margin="normal"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={isLoading}
              startIcon={<Email />}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        )}
        
        {/* Email OTP form */}
        {signupMethod === 'otp' && (
          <EmailOTPForm redirectPath="/dashboard" />
        )}
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account? <Link href="/signin">Sign in</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

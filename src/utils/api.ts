import { Client, Account, Databases, Storage, ID, Query, OAuthProvider, Avatars } from 'appwrite';
import { APPWRITE_CONFIG } from '@/lib/env';
import { APP_CONFIG } from '@/lib/env';

// Initialize client according to Appwrite docs
const client = new Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('67aed8360001b6dd8cb3'); // Verified project ID from documentation

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const avatars = new Avatars(client);

/**
 * User authentication functions
 */
async function signUp(email: string, password: string, name: string) {
  try {
    // Create a unique user ID
    const userId = ID.unique();
    
    // Create the user
    const response = await account.create(userId, email, password, name);
    console.log('User created successfully:', response);
    
    // Send email verification after successful signup
    try {
      const baseURL = APP_CONFIG.APP_URL;
      const verificationURL = `${baseURL}/verify-email`;
      await account.createVerification(verificationURL);
      console.log('Verification email sent');
    } catch (verificationError) {
      console.error('Error sending verification email:', verificationError);
      // We don't throw here to allow account creation to succeed even if verification fails
    }
    
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function signIn(email: string, password: string) {
  try {
    // Delete any existing session before creating a new one
    try {
      await signOut();
    } catch (error) {
      // Ignore errors from signOut, we just want to make sure we clean up before signing in
      console.log('No active session to clear before signing in');
    }
    
    // Create session according to Appwrite docs pattern
    await account.createEmailPasswordSession(email, password);
    
    // After creating the session, get the user details
    const user = await account.get();
    console.log('User signed in successfully:', user);
    return user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw new Error(`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function signOut() {
  try {
    try {
      const session = await account.getSession('current');
      if (session) {
        await account.deleteSession('current');
        return true;
      }
    } catch (e) {
      // No active session
    }
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    // Don't throw on error, as we want to clear local state even if server fails
    return false;
  }
}

async function listSessions() {
  try {
    return await account.listSessions();
  } catch (error) {
    console.error('Error listing sessions:', error);
    return { total: 0, sessions: [] };
  }
}

/**
 * Email verification functions
 */
async function createEmailVerification() {
  try {
    const baseURL = APP_CONFIG.APP_URL;
    const verificationURL = `${baseURL}/verify-email`;
    const response = await account.createVerification(verificationURL);
    console.log('Verification email sent successfully');
    return response;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function completeEmailVerification(userId: string, secret: string) {
  try {
    const response = await account.updateVerification(userId, secret);
    console.log('Email verified successfully');
    return response;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw new Error(`Failed to verify email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Password recovery functions
 */
async function createPasswordRecovery(email: string) {
  try {
    const baseURL = APP_CONFIG.APP_URL;
    const recoveryURL = `${baseURL}/reset-password`;
    const response = await account.createRecovery(email, recoveryURL);
    console.log('Password recovery email sent successfully');
    return response;
  } catch (error) {
    console.error('Error sending password recovery email:', error);
    throw new Error(`Failed to send recovery email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function completePasswordRecovery(userId: string, secret: string, newPassword: string) {
  try {
    const response = await account.updateRecovery(userId, secret, newPassword);
    console.log('Password recovery completed successfully');
    return response;
  } catch (error) {
    console.error('Error completing password recovery:', error);
    throw new Error(`Failed to complete recovery: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Magic URL Authentication methods
 */
async function createMagicURLToken(email: string) {
  try {
    // Get the base URL from environment variables
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Create a unique user ID for new users or fetch existing ID
    let userId = ID.unique();
    
    // Try to find if user with this email already exists
    try {
      const users = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASES.USERS,
        APPWRITE_CONFIG.COLLECTIONS.PROFILES,
        [Query.equal('email', email)]
      );
      
      if (users.documents.length > 0) {
        // Use existing user ID if found
        userId = users.documents[0].userId;
      }
    } catch (error) {
      console.log('No existing user found, creating new user ID');
    }
    
    // Create the magic URL token
    const magicURL = `${baseURL}/verify-magic-link`;
    const token = await account.createMagicURLToken(userId, email, magicURL);
    
    console.log('Magic URL token created successfully');
    return token;
  } catch (error) {
    console.error('Error creating magic URL token:', error);
    throw new Error(`Failed to create magic URL token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a session using magic URL token
 */
async function createMagicURLSession(userId: string, secret: string) {
  try {
    // Delete any existing session before creating a new one
    try {
      await signOut();
    } catch (error) {
      // Ignore errors from signOut, we just want to make sure we clean up
      console.log('No active session to clear before magic link signin');
    }
    
    const session = await account.createSession(userId, secret);
    console.log('Session created successfully with magic URL');
    
    // Now get the user details
    const user = await account.get();
    return user;
  } catch (error) {
    console.error('Error creating session with magic URL:', error);
    throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create an anonymous session for guests
 * This allows guests to access basic features without signing up
 */
async function createAnonymousSession() {
  try {
    // First check if we already have a session to avoid creating duplicate sessions
    try {
      const user = await account.get();
      console.log('User already has an active session:', user);
      return user;
    } catch (error) {
      // No active session, proceed to create anonymous session
    }
    
    const response = await account.createAnonymousSession();
    console.log('Anonymous session created successfully:', response);
    return response;
  } catch (error) {
    console.error('Error creating anonymous session:', error);
    throw new Error(`Failed to create anonymous session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user is authenticated, if not create an anonymous session
 * This ensures all users have at least guest access to permitted resources
 */
async function ensureSession() {
  try {
    // Try to get current session
    const session = await account.get();
    return session;
  } catch (error) {
    console.log('No active session detected, need to authenticate');
    
    // Check if refreshing the session might help
    try {
      const sessions = await account.listSessions();
      if (sessions && sessions.total > 0 && sessions.sessions[0]) {
        // Try to use the most recent session
        const latestSession = sessions.sessions[0];
        console.log('Found existing session, attempting to activate it');
        
        try {
          await account.updateSession(latestSession.$id);
          return await account.get();
        } catch (refreshError) {
          console.log('Failed to refresh existing session:', refreshError);
        }
      }
    } catch (sessionsError) {
      console.log('Error listing sessions:', sessionsError);
    }
    
    // If we still don't have a session, create an anonymous one
    try {
      console.log('Creating anonymous session as fallback');
      const anonymousSession = await createAnonymousSession();
      // After creating the anonymous session, get the user
      return await account.get();
    } catch (anonymousError) {
      console.error('Failed to create anonymous session:', anonymousError);
      throw anonymousError; // Re-throw to indicate failure
    }
  }
}

/**
 * Verify current session and handle authentication
 */
async function verifySession() {
  try {
    // Get current user information
    const currentUser = await account.get();
    return currentUser;
  } catch (error) {
    console.log('No active session');
    return null;
  }
}

/**
 * Validate and refresh the current session if needed
 */
async function validateSession() {
  try {
    // Attempt to get current user
    await account.get();
    return true;
  } catch (error: any) {
    // If the error is an authentication error (401)
    if (error.code === 401) {
      // Try to refresh the session
      try {
        const sessions = await account.listSessions();
        if (sessions && sessions.total > 0 && sessions.sessions[0]) {
          await account.updateSession(sessions.sessions[0].$id);
          return true;
        }
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
      }
    }
    return false;
  }
}

/**
 * Convert anonymous session to permanent account
 * @param email User's email
 * @param password User's password
 * @param name User's name
 */
async function convertAnonymousSession(email: string, password: string, name: string) {
  try {
    const response = await account.updateEmail(email, password);
    if (response) {
      await account.updateName(name);
    }
    console.log('Anonymous account converted successfully');
    return response;
  } catch (error) {
    console.error('Error converting anonymous account:', error);
    throw new Error(`Failed to convert anonymous account: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Email OTP Authentication functions
 */
async function createEmailOTP(email: string, enableSecurityPhrase: boolean = false) {
  try {
    // Generate a unique user ID
    const userId = ID.unique();
    
    // Create an email token with optional security phrase
    const response = await account.createEmailToken(userId, email, enableSecurityPhrase);
    console.log('Email OTP sent successfully');
    
    return {
      userId: response.userId,
      securityPhrase: enableSecurityPhrase ? response.phrase : null
    };
  } catch (error) {
    console.error('Error creating email OTP:', error);
    throw new Error(`Failed to create email OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify email OTP code and create session
 */
async function verifyEmailOTP(userId: string, secret: string) {
  try {
    // Delete any existing session before creating a new one
    try {
      await signOut();
    } catch (error) {
      // Ignore errors from signOut, we just want to make sure we clean up
      console.log('No active session to clear before OTP verification');
    }
    
    // Create a session using the OTP code
    const session = await account.createSession(userId, secret);
    console.log('Email OTP verified successfully');
    
    // After successful verification, get the user
    const user = await account.get();
    return user;
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    throw new Error(`Failed to verify email OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Multi-Factor Authentication (MFA) functions
 */

// Generate recovery codes for MFA
async function createMfaRecoveryCodes() {
  try {
    const response = await account.createMfaRecoveryCodes();
    console.log('MFA recovery codes generated successfully');
    return response.recoveryCodes;
  } catch (error) {
    console.error('Error generating MFA recovery codes:', error);
    throw new Error(`Failed to generate MFA recovery codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Enable or disable MFA on an account
async function updateMfa(enable: boolean) {
  try {
    const response = await account.updateMFA(enable);
    console.log(`MFA ${enable ? 'enabled' : 'disabled'} successfully`);
    return response;
  } catch (error) {
    console.error(`Error ${enable ? 'enabling' : 'disabling'} MFA:`, error);
    throw new Error(`Failed to ${enable ? 'enable' : 'disable'} MFA: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// List available MFA factors for the current user
async function listMfaFactors() {
  try {
    const response = await account.listMfaFactors();
    console.log('MFA factors listed successfully');
    return response;
  } catch (error) {
    console.error('Error listing MFA factors:', error);
    throw new Error(`Failed to list MFA factors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create an MFA challenge for a specific factor
async function createMfaChallenge(factor: 'email' | 'totp' | 'phone' | 'recoverycode') {
  try {
    const response = await account.createMfaChallenge(factor);
    console.log(`MFA challenge created successfully for factor: ${factor}`);
    return response;
  } catch (error) {
    console.error(`Error creating MFA challenge for factor ${factor}:`, error);
    throw new Error(`Failed to create MFA challenge: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Complete an MFA challenge
async function updateMfaChallenge(challengeId: string, otp: string) {
  try {
    const response = await account.updateMfaChallenge(challengeId, otp);
    console.log('MFA challenge completed successfully');
    return response;
  } catch (error) {
    console.error('Error completing MFA challenge:', error);
    throw new Error(`Failed to complete MFA challenge: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Verify the user's email before enabling MFA
async function createMfaEmailVerification() {
  try {
    const baseURL = APP_CONFIG.APP_URL;
    const verificationURL = `${baseURL}/verify-email`;
    const response = await account.createVerification(verificationURL);
    console.log('Email verification sent for MFA setup');
    return response;
  } catch (error) {
    console.error('Error creating email verification for MFA:', error);
    throw new Error(`Failed to create email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * User profile functions
 */
async function getUserProfile(userId: string) {
  try {
    console.log('Fetching user profile for user ID:', userId);
    // Verify we're using the correct database and collection IDs from the documentation
    const databaseId = APPWRITE_CONFIG.DATABASES.USERS || '67b885280000d2cb5411';
    const collectionId = APPWRITE_CONFIG.COLLECTIONS.PROFILES || '67b8853c003c55c82ff6';
    
    try {
      const response = await databases.getDocument(databaseId, collectionId, userId);
      console.log('Profile found:', response);
      return response;
    } catch (error: any) {
      // If document not found (404), create a new profile document
      if (error.code === 404) {
        console.log('Profile not found, creating new profile for user:', userId);
        // Get the user account info to populate basic profile data
        const currentUser = await account.get();
        return await createUserProfile(userId, currentUser);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return null instead of throwing to allow graceful handling
    return null;
  }
}

/**
 * Create a new user profile in the database
 */
async function createUserProfile(userId: string, userData: any) {
  try {
    console.log('Creating new user profile for:', userId, userData);
    const databaseId = APPWRITE_CONFIG.DATABASES.USERS || '67b885280000d2cb5411';
    const collectionId = APPWRITE_CONFIG.COLLECTIONS.PROFILES || '67b8853c003c55c82ff6';
    
    // Extract email from GitHub OAuth user if available
    const email = userData.email || 
                 (userData.provider === 'github' && userData.providerUid ? 
                  `${userData.providerUid}@github.user` : '');
    
    // Create the profile document with the user ID as document ID
    const response = await databases.createDocument(
      databaseId,
      collectionId,
      userId, // Use the userId as the document ID for easy lookup
      {
        userId: userId,
        name: userData.name || '',
        email: email,
        profilePicture: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        skills: [],
        bio: ''
      }
    );
    
    console.log('User profile created successfully:', response);
    return response;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error(`Failed to create user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function updateUserProfile(userId: string, data: any) {
  try {
    console.log('Updating user profile for:', userId, 'with data:', data);
    const databaseId = APPWRITE_CONFIG.DATABASES.USERS || '67b885280000d2cb5411';
    const collectionId = APPWRITE_CONFIG.COLLECTIONS.PROFILES || '67b8853c003c55c82ff6';
    
    try {
      // First check if profile exists
      await databases.getDocument(databaseId, collectionId, userId);
      
      // Update the document
      const response = await databases.updateDocument(
        databaseId,
        collectionId,
        userId,
        {
          ...data,
          updatedAt: new Date().toISOString()
        }
      );
      return response;
    } catch (error: any) {
      // If profile doesn't exist yet, create it
      if (error.code === 404) {
        console.log('Profile not found during update, creating new profile');
        // Get current user data to populate basic fields
        const currentUser = await account.get();
        const newProfile = await createUserProfile(userId, currentUser);
        
        // Apply the updates to the newly created profile
        if (Object.keys(data).length > 0) {
          return await databases.updateDocument(
            databaseId,
            collectionId,
            userId,
            {
              ...data,
              updatedAt: new Date().toISOString()
            }
          );
        }
        
        return newProfile;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Bookmark management functions
 */
async function addBookmark(userId: string, jobId: string) {
  try {
    // Check if bookmark already exists
    const existing = await databases.listDocuments(
      APPWRITE_CONFIG.DATABASES.BOOKMARKS,
      APPWRITE_CONFIG.COLLECTIONS.BOOKMARKS,
      [Query.equal('userId', userId), Query.equal('jobId', jobId)]
    );

    if (existing.documents.length > 0) {
      return existing.documents[0];
    }

    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.BOOKMARKS, 
      APPWRITE_CONFIG.COLLECTIONS.BOOKMARKS, 
      ID.unique(), 
      {
        userId,
        jobId,
        createdAt: new Date().toISOString(),
        bookmarkId: ID.unique(),
      }
    );
    
    console.log('Bookmark added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw new Error(`Failed to add bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function removeBookmark(bookmarkId: string) {
  try {
    await databases.deleteDocument(
      APPWRITE_CONFIG.DATABASES.BOOKMARKS,
      APPWRITE_CONFIG.COLLECTIONS.BOOKMARKS,
      bookmarkId
    );
    console.log('Bookmark removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw new Error(`Failed to remove bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transaction management functions
 */
async function addTransaction(userId: string, amount: number, type: string, status: string, transactionId: string) {
  try {
    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.TRANSACTIONS,
      APPWRITE_CONFIG.COLLECTIONS.TRANSACTIONS,
      ID.unique(),
      {
        userId,
        amount,
        type,
        createdAt: new Date().toISOString(),
        status,
        transactionId,
      }
    );
    console.log('Transaction added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw new Error(`Failed to add transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Job management functions
 */
async function fetchJobs() {
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.DATABASES.JOBS,
      APPWRITE_CONFIG.COLLECTIONS.JOBS,
    );
    return response;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw new Error(`Failed to fetch jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchJob(jobId: string) {
  try {
    const response = await databases.getDocument(
      APPWRITE_CONFIG.DATABASES.JOBS,
      APPWRITE_CONFIG.COLLECTIONS.JOBS,
      jobId
    );
    return response;
  } catch (error) {
    console.error('Error fetching job:', error);
    throw new Error(`Failed to fetch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Messaging functions
 */
async function sendMessage(senderId: string, receiverId: string, message: string, status: string) {
  try {
    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.MESSAGES,
      APPWRITE_CONFIG.COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        senderId,
        receiverId,
        message,
        timestamp: new Date().toISOString(),
        messageId: ID.unique(),
        status,
      }
    );
    console.log('Message sent successfully:', response);
    
    // Also create notification for recipient
    await addNotification(receiverId, `New message from user ${senderId}`, 'message');
    
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Notification management functions
 */
async function addNotification(userId: string, message: string, type: string) {
  try {
    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.NOTIFICATIONS,
      APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      {
        userId,
        message,
        createdAt: new Date().toISOString(),
        type,
        notificationId: ID.unique(),
        read: false,
      }
    );
    console.log('Notification added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw new Error(`Failed to add notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function markNotificationAsRead(notificationId: string) {
  try {
    const response = await databases.updateDocument(
      APPWRITE_CONFIG.DATABASES.NOTIFICATIONS,
      APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
      notificationId,
      { read: true }
    );
    return response;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(`Failed to update notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Project management functions
 */
async function addProject(ownerId: string, title: string, description: string, participants: string[], status: string) {
  try {
    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.PROJECTS,
      APPWRITE_CONFIG.COLLECTIONS.PROJECTS,
      ID.unique(),
      {
        ownerId,
        title,
        description,
        createdAt: new Date().toISOString(),
        participants,
        status,
        updatedAt: new Date().toISOString(),
        projectId: ID.unique(),
      }
    );
    console.log('Project added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding project:', error);
    throw new Error(`Failed to add project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getProjects(userId: string) {
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.DATABASES.PROJECTS,
      APPWRITE_CONFIG.COLLECTIONS.PROJECTS,
      [Query.equal('ownerId', userId)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Payment methods management
 */
async function addPaymentMethod(
  userId: string,
  type: string,
  details: string,
  isDefault: boolean = false
) {
  try {
    const response = await databases.createDocument(
      APPWRITE_CONFIG.DATABASES.PAYMENT_METHODS,
      APPWRITE_CONFIG.COLLECTIONS.PAYMENT_METHODS,
      ID.unique(),
      {
        userId,
        type,
        details,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentMethodId: ID.unique(),
        isDefault,
      }
    );
    console.log('Payment method added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw new Error(`Failed to add payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getUserPaymentMethods(userId: string) {
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.DATABASES.PAYMENT_METHODS,
      APPWRITE_CONFIG.COLLECTIONS.PAYMENT_METHODS,
      [Query.equal('userId', userId)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw new Error(`Failed to fetch payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * File storage functions
 */
async function uploadFile(bucketId: string, file: File, filePath: string, onProgress?: (progress: number) => void) {
  try {
    const response = await storage.createFile(
      bucketId,
      ID.unique(),
      file
    );
    console.log('File uploaded successfully:', response);
    return response;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getFilePreview(bucketId: string, fileId: string, width?: number, height?: number) {
  try {
    const response = await storage.getFilePreview(
      bucketId,
      fileId,
      width,
      height
    );
    return response;
  } catch (error) {
    console.error('Error getting file preview:', error);
    throw new Error(`Failed to get file preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * OAuth Authentication functions
 */
async function createGitHubOAuthSession(scopes: string[] = ['user:email']) {
  try {
    // Generate proper callback URLs
    const baseURL = APP_CONFIG.APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'https://web3lancer.app');
    
    const successURL = `${baseURL}/oauth/callback`;
    const failureURL = `${baseURL}/signin?error=github_auth_failed`;
    
    // Ensure OAuthProvider is correctly referenced
    if (!OAuthProvider || !OAuthProvider.Github) {
      console.error('OAuthProvider or OAuthProvider.Github is undefined');
      throw new Error('OAuth Provider configuration error');
    }
    
    // Create GitHub OAuth session with proper scopes and redirect URLs
    await account.createOAuth2Session(
      'github', // Use string value directly instead of OAuthProvider.Github
      successURL,
      failureURL,
      scopes
    );
    
    return true;
  } catch (error) {
    console.error('Error creating GitHub OAuth session:', error);
    throw new Error(`Failed to create GitHub OAuth session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process GitHub OAuth callback
 * This function helps when handling the callback manually rather than using automatic redirects
 */
async function handleGitHubOAuthCallback(code: string) {
  try {
    // For manual handling of the OAuth flow, you would verify the code
    // This is a placeholder for any manual verification needed
    // Appwrite handles most of this automatically through redirects
    
    // After OAuth redirect, we can get the current session which should now be authenticated
    const user = await account.get();
    
    // Create or update the user's profile after successful GitHub login
    try {
      await getUserProfile(user.$id);
    } catch (profileError) {
      console.log('Error checking profile during GitHub callback, will create later if needed');
    }
    
    return user;
  } catch (error) {
    console.error('Error handling GitHub OAuth callback:', error);
    throw new Error(`Failed to complete GitHub authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current session details including OAuth provider information
 */
async function getCurrentSession() {
  try {
    return await account.getSession('current');
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is currently logged in
 * @returns Whether the user is logged in
 */
async function isLoggedIn() {
  return (await getCurrentSession()) !== null;
}

/**
 * Refresh OAuth token if needed
 */
async function refreshOAuthSession(sessionId: string) {
  try {
    const session = await account.updateSession(sessionId);
    console.log('OAuth session refreshed successfully');
    return session;
  } catch (error) {
    console.error('Error refreshing OAuth session:', error);
    throw new Error(`Failed to refresh OAuth session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if session token needs refresh and refresh if needed
 */
async function ensureValidOAuthToken() {
  try {
    const session = await getCurrentSession();
    
    if (!session) return null;
    
    // Only proceed if this is an OAuth session
    if (session.provider && session.provider === 'github') {
      // Check if token is expired or about to expire (within 5 minutes)
      const expiryTime = session.providerAccessTokenExpiry;
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const expiresIn = expiryTime - now;
      
      // If token expires in less than 5 minutes, refresh it
      if (expiresIn < 300) {
        console.log('OAuth token about to expire, refreshing...');
        return await refreshOAuthSession(session.$id);
      }
    }
    
    return session;
  } catch (error) {
    console.error('Error ensuring valid OAuth token:', error);
    return null;
  }
}

/**
 * User management functions
 */
async function addUser(email: string, password: string, name: string) {
  try {
    const response = await account.create(ID.unique(), email, password, name);
    console.log('User added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding user:', error);
    throw new Error(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility functions for safe document retrieval
 */

/**
 * Safe document fetching that handles "Document not found" errors gracefully
 * @param databaseId Database ID
 * @param collectionId Collection ID
 * @param documentId Document ID
 * @param defaultValue Optional default value to return if document isn't found
 * @returns The document or the default value
 */
async function safeGetDocument(databaseId: string, collectionId: string, documentId: string, defaultValue: any = null) {
  try {
    // Validate the session before attempting to access data
    await validateSession();
    return await databases.getDocument(databaseId, collectionId, documentId);
  } catch (error: any) {
    // Check if this is a "Document not found" error
    if (error.code === 404) {
      console.log(`Document not found: ${documentId} in collection ${collectionId}`);
      return defaultValue;
    }
    
    // For authentication errors, try to refresh the session and retry
    if (error.code === 401) {
      try {
        const valid = await validateSession();
        if (valid) {
          return await databases.getDocument(databaseId, collectionId, documentId);
        }
      } catch (retryError) {
        console.error('Error after session validation retry:', retryError);
      }
    }
    
    // Rethrow other errors
    throw error;
  }
}

/**
 * Safe list documents that handles errors gracefully
 * @param databaseId Database ID
 * @param collectionId Collection ID
 * @param queries Query parameters
 * @returns List of documents or empty array on failure
 */
async function safeListDocuments(databaseId: string, collectionId: string, queries: any[] = []) {
  try {
    // Validate the session before attempting to access data
    await validateSession();
    return await databases.listDocuments(databaseId, collectionId, queries);
  } catch (error: any) {
    // For authentication errors, try to refresh the session and retry
    if (error.code === 401) {
      try {
        const valid = await validateSession();
        if (valid) {
          return await databases.listDocuments(databaseId, collectionId, queries);
        }
      } catch (retryError) {
        console.error('Error after session validation retry:', retryError);
      }
    }
    
    console.error(`Error listing documents in collection ${collectionId}:`, error);
    return { documents: [], total: 0 };
  }
}

export { 
  client, 
  account, 
  databases, 
  storage,
  avatars,
  ID, 
  signUp, 
  signIn,
  signOut,
  listSessions,
  createEmailVerification,
  completeEmailVerification,
  createPasswordRecovery,
  completePasswordRecovery,
  createMagicURLToken,
  createMagicURLSession,
  createAnonymousSession,
  ensureSession,
  verifySession,
  validateSession,
  convertAnonymousSession,
  createEmailOTP,
  verifyEmailOTP,
  createMfaRecoveryCodes,
  updateMfa,
  listMfaFactors,
  createMfaChallenge,
  updateMfaChallenge,
  createMfaEmailVerification,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  addBookmark, 
  removeBookmark,
  addTransaction,
  sendMessage,
  addNotification,
  markNotificationAsRead,
  addProject,
  getProjects,
  addUser,
  addPaymentMethod,
  getUserPaymentMethods,
  uploadFile,
  getFilePreview,
  fetchJobs,
  fetchJob,
  createGitHubOAuthSession,
  handleGitHubOAuthCallback,
  getCurrentSession,
  refreshOAuthSession,
  ensureValidOAuthToken,
  isLoggedIn,
  Query,
  safeGetDocument,
  safeListDocuments
};
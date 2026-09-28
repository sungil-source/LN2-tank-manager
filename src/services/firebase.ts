import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Scopes for Google Sheets and Google Drive file access
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory and session token caching per security guidelines
let isSigningIn = false;
let cachedAccessToken: string | null = null;

try {
  cachedAccessToken = sessionStorage.getItem('ln2_google_access_token');
} catch (e) {}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('ln2_google_access_token');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth access token could not be obtained.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('ln2_google_access_token', credential.accessToken);
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = sessionStorage.getItem('ln2_google_access_token');
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch (e) {}

  // If no token in memory or session, trigger Google sign-in popup to get access token
  if (!isSigningIn) {
    try {
      const res = await googleSignIn();
      return res?.accessToken || null;
    } catch (e) {
      console.warn('Could not auto-acquire Google access token:', e);
      return null;
    }
  }
  return null;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('ln2_google_access_token');
  } catch (e) {}
};

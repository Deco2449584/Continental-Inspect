import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { auth, isFirebaseConfigured } from '@/services/firebaseConfig';
import {
  buildFallbackProfile,
  ensureUserProfile,
  resolveUserRole,
} from '@/services/userRepository';
import type { UserProfile, UserRole } from '@/types/auth';

type AuthContextValue = {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  profile: UserProfile | null;
  profileSyncFailed: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setProfileSyncFailed(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setProfileSyncFailed(false);

      try {
        const { profile: nextProfile, syncedToFirestore } = await ensureUserProfile(firebaseUser);
        setProfile(nextProfile);
        setProfileSyncFailed(!syncedToFirestore);
      } catch {
        setProfile(buildFallbackProfile(firebaseUser));
        setProfileSyncFailed(true);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured for this build.');
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setProfile(null);
    setProfileSyncFailed(false);
  }, []);

  const role = resolveUserRole(user, profile);
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      role,
      isAdmin,
      profile,
      profileSyncFailed,
      isLoading,
      isConfigured: isFirebaseConfigured,
      signIn,
      signOut,
    }),
    [user, role, isAdmin, profile, profileSyncFailed, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import { auth, isFirebaseConfigured } from '@/services/firebaseConfig';
import {
  EmployeeAccessError,
  loadEmployeeProfile,
  resolveRoleFromEmployee,
  resolveUserRole,
  subscribeToEmployeeRecord,
} from '@/services/userRepository';
import type { EmployeeProfile, UserRole } from '@/types/auth';

export type AuthAccessDeniedReason =
  | 'not_found'
  | 'inactive'
  | 'no_email'
  | 'firestore_unavailable'
  | null;

const INACTIVE_ALERT_MESSAGE =
  'Your account has been deactivated. Please contact management.';

type AuthContextValue = {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  profile: EmployeeProfile | null;
  profileSyncFailed: boolean;
  accessDeniedReason: AuthAccessDeniedReason;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<AuthAccessDeniedReason>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactiveSignOutRef = useRef(false);

  const rejectSession = useCallback(async (reason: AuthAccessDeniedReason) => {
    setProfile(null);
    setProfileSyncFailed(false);
    setAccessDeniedReason(reason);
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  }, []);

  const handleInactiveAccount = useCallback(async () => {
    if (inactiveSignOutRef.current) return;
    inactiveSignOutRef.current = true;

    Alert.alert('Account deactivated', INACTIVE_ALERT_MESSAGE);
    await rejectSession('inactive');
    inactiveSignOutRef.current = false;
  }, [rejectSession]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAccessDeniedReason(null);

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setProfileSyncFailed(false);
        setIsLoading(false);
        return;
      }

      setUser(firebaseUser);
      setIsLoading(true);
      setProfileSyncFailed(false);

      try {
        const { profile: nextProfile } = await loadEmployeeProfile(
          firebaseUser.uid,
          firebaseUser.email,
        );
        setProfile(nextProfile);
        setProfileSyncFailed(false);
        setAccessDeniedReason(null);
      } catch (error) {
        setProfile(null);

        if (error instanceof EmployeeAccessError) {
          if (
            error.code === 'not_found' ||
            error.code === 'inactive' ||
            error.code === 'no_email'
          ) {
            if (error.code === 'inactive') {
              Alert.alert('Account deactivated', INACTIVE_ALERT_MESSAGE);
            }
            await rejectSession(error.code);
            return;
          }
          setProfileSyncFailed(true);
          await rejectSession('firestore_unavailable');
          return;
        }

        setProfileSyncFailed(true);
        await rejectSession('firestore_unavailable');
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [rejectSession]);

  useEffect(() => {
    const docId = profile?.docId;
    if (!user || !docId) {
      return;
    }

    const unsubscribe = subscribeToEmployeeRecord(docId, (record) => {
      if (!record || !record.active) {
        void handleInactiveAccount();
        return;
      }

      setProfile((current) => {
        if (!current || current.docId !== docId) {
          return current;
        }

        const email = user.email ?? current.email;
        return {
          ...current,
          ...record,
          email: record.email || email,
          role: resolveRoleFromEmployee(record, email),
        };
      });
    });

    return unsubscribe;
  }, [user, profile?.docId, handleInactiveAccount]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured for this build.');
    }
    setAccessDeniedReason(null);
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
    setAccessDeniedReason(null);
  }, []);

  const role = resolveUserRole(user?.email, profile);
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      role,
      isAdmin,
      profile,
      profileSyncFailed,
      accessDeniedReason,
      isLoading,
      isConfigured: isFirebaseConfigured,
      signIn,
      signOut,
    }),
    [
      user,
      role,
      isAdmin,
      profile,
      profileSyncFailed,
      accessDeniedReason,
      isLoading,
      signIn,
      signOut,
    ],
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

import { getApps, initializeApp } from 'firebase/app';
import { User, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

import { db } from '@/services/firebaseConfig';
import type { UserProfile, UserRole } from '@/types/auth';

const USERS_COLLECTION = 'users';

function parseAdminEmails(): string[] {
  return (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): string[] {
  return parseAdminEmails();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.trim().toLowerCase());
}

/** Role from .env when Firestore is unavailable or not synced yet. */
export function resolveRoleFromEmail(email: string | null | undefined): UserRole {
  return isAdminEmail(email) ? 'admin' : 'operator';
}

export function buildFallbackProfile(user: User): UserProfile {
  const email = user.email ?? '';
  return {
    email,
    role: resolveRoleFromEmail(email),
    updatedAt: new Date().toISOString(),
  };
}

export function resolveUserRole(
  user: User | null | undefined,
  profile: UserProfile | null | undefined,
): UserRole {
  if (!user) return 'operator';
  if (isAdminEmail(user.email)) return 'admin';
  if (profile?.role === 'admin') return 'admin';
  return profile?.role === 'operator' ? 'operator' : 'operator';
}

export type EnsureUserProfileResult = {
  profile: UserProfile;
  syncedToFirestore: boolean;
};

export async function ensureUserProfile(user: User): Promise<EnsureUserProfileResult> {
  if (!db) {
    return { profile: buildFallbackProfile(user), syncedToFirestore: false };
  }

  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const email = user.email ?? '';
  const shouldBeAdmin = isAdminEmail(email);
  const now = new Date().toISOString();

  try {
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const profile: UserProfile = {
        email,
        role: shouldBeAdmin ? 'admin' : 'operator',
        updatedAt: now,
      };
      await setDoc(userRef, profile);
      return { profile, syncedToFirestore: true };
    }

    const existing = snapshot.data() as UserProfile;
    if (shouldBeAdmin && existing.role !== 'admin') {
      const profile: UserProfile = { ...existing, email, role: 'admin', updatedAt: now };
      await updateDoc(userRef, profile);
      return { profile, syncedToFirestore: true };
    }

    return {
      profile: {
        email: existing.email ?? email,
        role: existing.role === 'admin' || shouldBeAdmin ? 'admin' : 'operator',
        updatedAt: existing.updatedAt ?? now,
      },
      syncedToFirestore: true,
    };
  } catch {
    return { profile: buildFallbackProfile(user), syncedToFirestore: false };
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;

  try {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as UserProfile;
    return {
      email: data.email ?? '',
      role: data.role === 'admin' ? 'admin' : 'operator',
      updatedAt: data.updatedAt ?? '',
    };
  } catch {
    return null;
  }
}

export function getRoleLabel(role: UserRole): string {
  return role === 'admin' ? 'Administrator' : 'Operator';
}

export type ManagedUser = {
  uid: string;
  email: string;
  role: UserRole;
  updatedAt: string;
};

/** Fetch all user profiles (admin only — requires Firestore rules to allow). */
export async function fetchAllUsers(): Promise<ManagedUser[]> {
  if (!db) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, USERS_COLLECTION), orderBy('email')),
    );
    return snapshot.docs.map((d) => {
      const data = d.data() as UserProfile;
      return {
        uid: d.id,
        email: data.email ?? '',
        role: data.role === 'admin' ? 'admin' : 'operator',
        updatedAt: data.updatedAt ?? '',
      };
    });
  } catch {
    return [];
  }
}

/** Update the role of an existing user profile. */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    role,
    updatedAt: new Date().toISOString(),
  });
}

/** Delete a user profile document from Firestore. */
export async function deleteUserProfile(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

/**
 * Create a new Firebase Auth user + Firestore profile using a secondary
 * Firebase App instance so the admin session is not affected.
 */
export async function createManagedUser(
  email: string,
  password: string,
  role: UserRole,
): Promise<ManagedUser> {
  if (!db) throw new Error('Firestore is not configured.');

  // Use a secondary app so the current admin session is preserved
  const secondaryAppName = '__user_creation__';
  const existingApps = getApps();
  const secondaryApp =
    existingApps.find((a) => a.name === secondaryAppName) ??
    initializeApp(
      {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
      },
      secondaryAppName,
    );

  const secondaryAuth = getAuth(secondaryApp);
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
  const uid = credential.user.uid;

  // Sign out from secondary app immediately
  await secondaryAuth.signOut();

  const now = new Date().toISOString();
  const profile: UserProfile = { email: email.trim(), role, updatedAt: now };
  await setDoc(doc(db, USERS_COLLECTION, uid), profile);

  return { uid, email: email.trim(), role, updatedAt: now };
}

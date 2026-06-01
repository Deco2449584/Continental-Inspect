import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
    createManagedUser,
    deleteUserProfile,
    fetchAllUsers,
    getRoleLabel,
    updateUserRole,
    type ManagedUser,
} from '@/services/userRepository';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { UserRole } from '@/types/auth';

const RED     = '#E21F28';
const RED_DIM = 'rgba(226,31,40,0.12)';

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    sectionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.primary,
      marginTop: 4,
    },

    // ── User list cards ──────────────────────────────────────────────────────
    userCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    userAccent: {
      width: 3,
      backgroundColor: RED,
    },
    userBody: {
      flex: 1,
      paddingHorizontal: 13,
      paddingVertical: 11,
      gap: 4,
    },
    userEmail: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    roleBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
    },
    userActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
      gap: 2,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Empty / loading ──────────────────────────────────────────────────────
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
    },

    // ── Add user button ──────────────────────────────────────────────────────
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: RED,
      borderStyle: 'dashed',
      backgroundColor: RED_DIM,
    },
    addBtnPressed: { opacity: 0.8 },
    addBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: RED,
    },

    // ── Shared modal shell ───────────────────────────────────────────────────
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    modalAccent: {
      height: 4,
      backgroundColor: RED,
    },
    modalHeader: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 4,
      gap: 4,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    modalIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: RED_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.onSurface,
    },
    modalSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      paddingLeft: 46,
      marginBottom: 6,
    },
    modalBody: {
      paddingHorizontal: 24,
      paddingBottom: 20,
      gap: 14,
    },
    modalDivider: {
      height: 1,
      backgroundColor: colors.border.onSurface,
    },
    modalFooter: {
      flexDirection: 'row',
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border.onSurface,
    },
    modalCancelText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.secondary,
    },
    modalConfirmBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmBtnPressed: {
      backgroundColor: RED_DIM,
    },
    modalConfirmText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: RED,
    },
    // Destructive confirm (red background)
    modalDestructiveBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: RED,
    },
    modalDestructiveBtnPressed: {
      backgroundColor: '#B81820',
    },
    modalDestructiveText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },

    // ── Form fields ──────────────────────────────────────────────────────────
    fieldGroup: { gap: 6 },
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
    },
    inputFocused: { borderColor: RED },

    // ── Role chips ───────────────────────────────────────────────────────────
    roleRow: { flexDirection: 'row', gap: 10 },
    roleChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
    },
    roleChipActive: {
      borderColor: RED,
      backgroundColor: RED_DIM,
    },
    roleChipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.secondary,
    },
    roleChipTextActive: { color: RED },

    // ── Info / error modal body ───────────────────────────────────────────────
    infoBody: {
      padding: 24,
      gap: 14,
      alignItems: 'center',
    },
    infoIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: RED_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 17,
      color: colors.text.onSurface,
      textAlign: 'center',
    },
    infoMessage: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    infoBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoBtnPressed: { backgroundColor: RED_DIM },
    infoBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: RED,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: UserRole) {
  return role === 'admin'
    ? { bg: RED_DIM, text: RED }
    : { bg: 'rgba(156,163,175,0.15)', text: '#6B7280' };
}

// ─── Generic info/error modal ─────────────────────────────────────────────────

type InfoModalState = { title: string; message: string } | null;

function AppInfoModal({
  state,
  onClose,
  styles,
}: {
  state: InfoModalState;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal
      visible={!!state}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.infoBody}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="alert-circle-outline" size={26} color={RED} />
            </View>
            <Text style={styles.infoTitle}>{state?.title ?? ''}</Text>
            <Text style={styles.infoMessage}>{state?.message ?? ''}</Text>
          </View>
          <View style={styles.modalDivider} />
          <Pressable
            style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
            onPress={onClose}>
            <Text style={styles.infoBtnText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

type DeleteModalState = { user: ManagedUser } | null;

function DeleteConfirmModal({
  state,
  onClose,
  onConfirm,
  isDeleting,
  styles,
}: {
  state: DeleteModalState;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal
      visible={!!state}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.infoBody}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="trash-outline" size={24} color={RED} />
            </View>
            <Text style={styles.infoTitle}>Delete user</Text>
            <Text style={styles.infoMessage}>
              Remove <Text style={{ fontWeight: '700' }}>{state?.user.email}</Text>?{'\n\n'}
              This will delete their profile and revoke access to the app.
            </Text>
          </View>
          <View style={styles.modalDivider} />
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={onClose}
              disabled={isDeleting}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalDestructiveBtn,
                pressed && styles.modalDestructiveBtnPressed,
              ]}
              onPress={onConfirm}
              disabled={isDeleting}>
              {isDeleting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.modalDestructiveText}>Delete</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Role selector ────────────────────────────────────────────────────────────

function RoleSelector({
  value,
  onChange,
  styles,
  colors,
}: {
  value: UserRole;
  onChange: (r: UserRole) => void;
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
}) {
  return (
    <View style={styles.roleRow}>
      {(['operator', 'admin'] as UserRole[]).map((r) => {
        const active = value === r;
        return (
          <Pressable
            key={r}
            style={[styles.roleChip, active && styles.roleChipActive]}
            onPress={() => onChange(r)}>
            <Ionicons
              name={r === 'admin' ? 'shield-checkmark-outline' : 'person-outline'}
              size={15}
              color={active ? RED : colors.text.secondary}
            />
            <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
              {getRoleLabel(r)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

type CreateModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (user: ManagedUser) => void;
  onError: (title: string, message: string) => void;
};

function CreateUserModal({ visible, onClose, onCreated, onError }: CreateModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<UserRole>('operator');
  const [isSaving, setIsSaving] = useState(false);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    setRole('operator');
    setIsSaving(false);
  }

  async function handleCreate() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      onError('Missing fields', 'Please enter an email and password.');
      return;
    }
    if (password.length < 6) {
      onError('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const newUser = await createManagedUser(trimmedEmail, password, role);
      onCreated(newUser);
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('email-already-in-use')) {
        onError('Email in use', 'An account with this email already exists.');
      } else if (msg.includes('invalid-email')) {
        onError('Invalid email', 'Please enter a valid email address.');
      } else {
        onError('Could not create user', msg);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalAccent} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="person-add-outline" size={18} color={RED} />
              </View>
              <Text style={styles.modalTitle}>New user</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              The user can sign in immediately with these credentials.
            </Text>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={colors.text.onSurfaceMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.text.onSurfaceMuted}
                secureTextEntry
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <RoleSelector value={role} onChange={setRole} styles={styles} colors={colors} />
            </View>
          </View>

          <View style={styles.modalDivider} />
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => { reset(); onClose(); }}
              disabled={isSaving}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalConfirmBtn,
                pressed && styles.modalConfirmBtnPressed,
              ]}
              onPress={handleCreate}
              disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={RED} size="small" />
                : <Text style={styles.modalConfirmText}>Create</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

type EditRoleModalProps = {
  user: ManagedUser | null;
  onClose: () => void;
  onUpdated: (uid: string, role: UserRole) => void;
  onError: (title: string, message: string) => void;
};

function EditRoleModal({ user, onClose, onUpdated, onError }: EditRoleModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [role, setRole]         = useState<UserRole>('operator');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateUserRole(user.uid, role);
      onUpdated(user.uid, role);
      onClose();
    } catch {
      onError('Error', 'Could not update role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={!!user}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="shield-outline" size={18} color={RED} />
              </View>
              <Text style={styles.modalTitle}>Edit role</Text>
            </View>
            <Text style={styles.modalSubtitle}>{user?.email}</Text>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <RoleSelector value={role} onChange={setRole} styles={styles} colors={colors} />
            </View>
          </View>

          <View style={styles.modalDivider} />
          <View style={styles.modalFooter}>
            <Pressable style={styles.modalCancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalConfirmBtn,
                pressed && styles.modalConfirmBtnPressed,
              ]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={RED} size="small" />
                : <Text style={styles.modalConfirmText}>Save</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

type UserManagementSectionProps = {
  currentUserUid: string;
};

export function UserManagementSection({ currentUserUid }: UserManagementSectionProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { user: adminUser } = useAuth();

  const [users, setUsers]               = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [editingUser, setEditingUser]   = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalState>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [infoModal, setInfoModal]       = useState<InfoModalState>(null);

  function showError(title: string, message: string) {
    setInfoModal({ title, message });
  }

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const list = await fetchAllUsers();
    setUsers(list);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function handleCreated(newUser: ManagedUser) {
    setUsers((prev) =>
      [...prev, newUser].sort((a, b) => a.email.localeCompare(b.email)),
    );
  }

  function handleRoleUpdated(uid: string, role: UserRole) {
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
  }

  function requestDelete(user: ManagedUser) {
    if (user.uid === currentUserUid) {
      showError('Not allowed', 'You cannot delete your own account.');
      return;
    }
    setDeleteTarget({ user });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Get admin's current ID token to authenticate the REST API call
      const idToken = await adminUser?.getIdToken();
      await deleteUserProfile(deleteTarget.user.uid, idToken ?? '');
      setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.user.uid));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setDeleteTarget(null);
      if (msg.startsWith('AUTH_DELETE_FAILED')) {
        // Firestore was deleted but Auth deletion failed — user is already locked out
        showError(
          'Partially deleted',
          'The user profile was removed but the Auth account could not be deleted via REST API. You can remove it manually from the Firebase console.',
        );
        setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.user.uid));
      } else {
        showError('Delete failed', 'Could not delete the user. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Text style={styles.sectionTitle}>User management</Text>

      {isLoading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={RED} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={32} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {users.map((user) => {
            const badge = roleBadgeStyle(user.role);
            return (
              <View key={user.uid} style={styles.userCard}>
                <View style={styles.userAccent} />
                <View style={styles.userBody}>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconBtn,
                      { backgroundColor: pressed ? RED_DIM : 'transparent' },
                    ]}
                    onPress={() => setEditingUser(user)}>
                    <Ionicons name="create-outline" size={19} color={colors.accent.primary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconBtn,
                      { backgroundColor: pressed ? RED_DIM : 'transparent' },
                    ]}
                    onPress={() => requestDelete(user)}>
                    <Ionicons name="trash-outline" size={19} color={colors.text.onSurfaceMuted} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        onPress={() => setShowCreate(true)}>
        <Ionicons name="person-add-outline" size={18} color={RED} />
        <Text style={styles.addBtnText}>Add user</Text>
      </Pressable>

      {/* Create modal */}
      <CreateUserModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        onError={showError}
      />

      {/* Edit role modal */}
      <EditRoleModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUpdated={handleRoleUpdated}
        onError={showError}
      />

      {/* Delete confirm modal */}
      <DeleteConfirmModal
        state={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        styles={styles}
      />

      {/* Info / error modal */}
      <AppInfoModal
        state={infoModal}
        onClose={() => setInfoModal(null)}
        styles={styles}
      />
    </>
  );
}

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

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
    deactivateEmployee,
    fetchAllEmployees,
    getRoleLabel,
    resolveRoleFromEmployee,
    updateEmployeeDepartment,
    type ManagedEmployee,
} from '@/services/userRepository';
import { ACCENT, ACCENT_DIM, ACCENT_PRESSED } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { UserRole } from '@/types/auth';

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
      backgroundColor: ACCENT,
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
      borderColor: ACCENT,
      borderStyle: 'dashed',
      backgroundColor: ACCENT_DIM,
    },
    addBtnPressed: { opacity: 0.8 },
    addBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
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
      backgroundColor: ACCENT,
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
      backgroundColor: ACCENT_DIM,
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
      backgroundColor: ACCENT_DIM,
    },
    modalConfirmText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
    },
    // Destructive confirm (red background)
    modalDestructiveBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ACCENT,
    },
    modalDestructiveBtnPressed: {
      backgroundColor: ACCENT_PRESSED,
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
    inputFocused: { borderColor: ACCENT },

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
      borderColor: ACCENT,
      backgroundColor: ACCENT_DIM,
    },
    roleChipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.secondary,
    },
    roleChipTextActive: { color: ACCENT },

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
      backgroundColor: ACCENT_DIM,
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
    infoBtnPressed: { backgroundColor: ACCENT_DIM },
    infoBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: UserRole) {
  return role === 'admin'
    ? { bg: ACCENT_DIM, text: ACCENT }
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
              <Ionicons name="alert-circle-outline" size={26} color={ACCENT} />
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

type DeleteModalState = { user: ManagedEmployee } | null;

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
              <Ionicons name="trash-outline" size={24} color={ACCENT} />
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
                : <Text style={styles.modalDestructiveText}>Deactivate</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DEPARTMENT_OPTIONS = ['logistica', 'admin', 'operations', 'warehouse', 'export'] as const;

type EditDepartmentModalProps = {
  user: ManagedEmployee | null;
  onClose: () => void;
  onUpdated: (docId: string, department: string, role: UserRole) => void;
  onError: (title: string, message: string) => void;
};

function EditDepartmentModal({ user, onClose, onUpdated, onError }: EditDepartmentModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [department, setDepartment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) setDepartment(user.department);
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateEmployeeDepartment(user.docId, department);
      const role = resolveRoleFromEmployee({ department }, user.email);
      onUpdated(user.docId, department.trim(), role);
      onClose();
    } catch {
      onError('Error', 'Could not update department. Please try again.');
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
                <Ionicons name="shield-outline" size={18} color={ACCENT} />
              </View>
              <Text style={styles.modalTitle}>Edit department</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {user?.name} · {user?.email}
            </Text>
            <Text style={[styles.modalSubtitle, { marginTop: 4 }]}>
              Admin access: logistica or admin
            </Text>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Department</Text>
              <View style={styles.roleRow}>
                {DEPARTMENT_OPTIONS.map((dept) => {
                  const active = department.toLowerCase() === dept;
                  return (
                    <Pressable
                      key={dept}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                      onPress={() => setDepartment(dept)}>
                      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
              {isSaving ? (
                <ActivityIndicator color={ACCENT} size="small" />
              ) : (
                <Text style={styles.modalConfirmText}>Save</Text>
              )}
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
  const [users, setUsers]               = useState<ManagedEmployee[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [editingUser, setEditingUser]   = useState<ManagedEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalState>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [infoModal, setInfoModal]       = useState<InfoModalState>(null);

  function showError(title: string, message: string) {
    setInfoModal({ title, message });
  }

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const list = await fetchAllEmployees();
    setUsers(list);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function handleDepartmentUpdated(docId: string, department: string, role: UserRole) {
    setUsers((prev) =>
      prev.map((u) => (u.docId === docId ? { ...u, department, role } : u)),
    );
  }

  function requestDelete(user: ManagedEmployee) {
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
      await deactivateEmployee(deleteTarget.user.docId);
      setUsers((prev) => prev.filter((u) => u.docId !== deleteTarget.user.docId));
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
      showError('Deactivate failed', 'Could not deactivate the employee. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Employee directory</Text>

      {isLoading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={32} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No employees found</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {users.map((user) => {
            const badge = roleBadgeStyle(user.role);
            return (
              <View key={user.uid} style={styles.userCard}>
                <View style={styles.userAccent} />
                <View style={styles.userBody}>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.name || user.email}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text.onSurfaceMuted }}>
                    {user.employeeId} · {user.department}
                    {!user.active ? ' · inactive' : ''}
                  </Text>
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
                      { backgroundColor: pressed ? ACCENT_DIM : 'transparent' },
                    ]}
                    onPress={() => setEditingUser(user)}>
                    <Ionicons name="create-outline" size={19} color={colors.accent.primary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconBtn,
                      { backgroundColor: pressed ? ACCENT_DIM : 'transparent' },
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

      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.text.secondary }}>
        New employees are provisioned in the Firestore employees collection (Auth + active
        record required).
      </Text>

      {/* Edit department modal */}
      <EditDepartmentModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUpdated={handleDepartmentUpdated}
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

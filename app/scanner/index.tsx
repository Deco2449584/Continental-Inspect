import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EvidencePhotosField } from '@/components/EvidencePhotosField';
import { OptionGroup } from '@/components/OptionGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/VehiclesContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  EMPTY_CARGO_INSPECTION_INPUT,
  type ConservationType,
  type NewCargoInspectionInput,
} from '@/types';

const CONSERVATION_OPTIONS: ConservationType[] = ['Congelado', 'Refrigerado', 'Ambiente'];

type FormState = NewCargoInspectionInput;

function parseWeight(value: string): number {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseBoxCount(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function CargoInspectionFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createFormStyles);
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { isAdmin } = useAuth();
  const {
    inspections,
    isLoading: inspectionsLoading,
    addInspection,
    updateInspectionById,
    lookupInspectionByUldId,
  } = useCargoInspections();

  const [form, setForm] = useState<FormState>({ ...EMPTY_CARGO_INSPECTION_INPUT });
  const [weightText, setWeightText] = useState('0');
  const [boxCountText, setBoxCountText] = useState('0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(editingId);

  const patchForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_CARGO_INSPECTION_INPUT });
    setWeightText('0');
    setBoxCountText('0');
    setEditingId(null);
  }, []);

  useEffect(() => {
    if (!editId || inspectionsLoading) return;
    if (!isAdmin) {
      Alert.alert('Not allowed', 'Only administrators can edit inspections.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    const existing = inspections.find((item) => item.id === editId);
    if (!existing) return;

    setEditingId(existing.id);
    setForm({
      uldId: existing.uldId,
      awbNumber: existing.awbNumber,
      conservationType: existing.conservationType,
      foodType: existing.foodType,
      weightKg: existing.weightKg,
      boxCount: existing.boxCount,
      hasIssues: existing.hasIssues,
      issueDescription: existing.issueDescription ?? '',
      photoEvidence: [...existing.photoEvidence],
      videoEvidence: [...existing.videoEvidence],
    });
    setWeightText(String(existing.weightKg));
    setBoxCountText(String(existing.boxCount));
  }, [editId, isAdmin, inspections, inspectionsLoading, router]);

  const buildPayload = (): NewCargoInspectionInput | null => {
    const uldId = form.uldId.trim();
    const awbNumber = form.awbNumber.trim();
    const foodType = form.foodType.trim();

    if (!uldId) {
      Alert.alert('ULD required', 'Enter the ULD ID (e.g. AKE 12345 CX).');
      return null;
    }
    if (!awbNumber) {
      Alert.alert('AWB required', 'Enter the air waybill number.');
      return null;
    }
    if (!foodType) {
      Alert.alert('Food type required', 'Enter the type of food or product.');
      return null;
    }
    if (form.hasIssues && !form.issueDescription?.trim()) {
      Alert.alert('Issue description', 'Describe the issue when cargo has failures.');
      return null;
    }

    return {
      uldId,
      awbNumber,
      conservationType: form.conservationType,
      foodType,
      weightKg: parseWeight(weightText),
      boxCount: parseBoxCount(boxCountText),
      hasIssues: form.hasIssues,
      issueDescription: form.hasIssues ? form.issueDescription?.trim() ?? '' : '',
      photoEvidence: form.photoEvidence,
      videoEvidence: form.videoEvidence,
    };
  };

  const saveInspection = async (andNext: boolean) => {
    const payload = buildPayload();
    if (!payload || isSaving) return;

    setIsSaving(true);
    try {
      if (isEditMode && editingId) {
        await updateInspectionById(editingId, payload);
        router.replace(`/cargo/${encodeURIComponent(editingId)}` as Href);
        return;
      }

      const duplicate = await lookupInspectionByUldId(payload.uldId);
      if (duplicate) {
        Alert.alert(
          'ULD already registered',
          `${duplicate.uldId} was inspected on ${duplicate.awbNumber}. Open the existing record or use another ULD.`,
        );
        setIsSaving(false);
        return;
      }

      await addInspection(payload);

      if (andNext) {
        resetForm();
        Alert.alert('Saved', 'Inspection saved. You can register the next ULD.');
      } else {
        router.replace('/(tabs)' as Href);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'DUPLICATE_ULD') {
        Alert.alert('Duplicate ULD', 'This ULD is already registered today.');
      } else {
        Alert.alert('Error', 'Could not save the inspection. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVideoPlaceholder = () => {
    Alert.alert(
      'Video evidence',
      'Video capture (max 30s) will be available in a future update. Photos are saved with this inspection.',
    );
  };

  if (inspectionsLoading && editId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const formBottomPadding = Math.max(insets.bottom, 16) + 24;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title={isEditMode ? 'Edit inspection' : 'New cargo inspection'}
        subtitle={`${brand.panelTitle} · ${brand.location}`}
        onBack={() => router.back()}
        backLabel="Back"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: formBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.formHint}>
            Register AKE/PMC container intake. ULD field is ready for future OCR scanning.
          </Text>

          <View style={styles.formCard}>
            <FormField label="ULD ID">
              <TextInput
                style={styles.input}
                value={form.uldId}
                onChangeText={(text) => patchForm({ uldId: text })}
                placeholder="AKE 12345 CX"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isEditMode}
              />
            </FormField>

            <FormField label="Air waybill (AWB)">
              <TextInput
                style={styles.input}
                value={form.awbNumber}
                onChangeText={(text) => patchForm({ awbNumber: text })}
                placeholder="AWB number"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </FormField>

            <OptionGroup
              label="Conservation type"
              options={CONSERVATION_OPTIONS}
              value={form.conservationType}
              onChange={(value) => patchForm({ conservationType: value })}
            />

            <FormField label="Food type">
              <TextInput
                style={styles.input}
                value={form.foodType}
                onChangeText={(text) => patchForm({ foodType: text })}
                placeholder="e.g. SALMÓN FRESCO"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCorrect={false}
              />
            </FormField>

            <View style={styles.rowTwo}>
              <View style={styles.halfField}>
                <FormField label="Weight (kg)">
                  <TextInput
                    style={styles.input}
                    value={weightText}
                    onChangeText={setWeightText}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.onSurfaceMuted}
                  />
                </FormField>
              </View>
              <View style={styles.halfField}>
                <FormField label="Box count">
                  <TextInput
                    style={styles.input}
                    value={boxCountText}
                    onChangeText={setBoxCountText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.onSurfaceMuted}
                  />
                </FormField>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Cargo has issues?</Text>
                <Text style={styles.switchHint}>
                  Toggle on if damage, temperature breach, or documentation problems
                </Text>
              </View>
              <Switch
                value={form.hasIssues}
                onValueChange={(hasIssues) => patchForm({ hasIssues })}
                trackColor={{
                  false: colors.border.onSurface,
                  true: colors.accent.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {form.hasIssues ? (
              <FormField label="Issue description">
                <TextInput
                  style={styles.textArea}
                  value={form.issueDescription ?? ''}
                  onChangeText={(text) => patchForm({ issueDescription: text })}
                  placeholder="Describe the issue found during inspection..."
                  placeholderTextColor={colors.text.onSurfaceMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </FormField>
            ) : null}

            <EvidencePhotosField
              photos={form.photoEvidence}
              onChange={(photoEvidence) => patchForm({ photoEvidence })}
              isAdmin={isAdmin}
            />

            <Pressable
              style={({ pressed }) => [
                styles.videoButton,
                pressed && styles.videoButtonPressed,
              ]}
              onPress={handleAddVideoPlaceholder}>
              <Text style={styles.videoButtonText}>Add Video (Max 30s)</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSaving) && styles.primaryButtonPressed,
              isSaving && styles.primaryButtonDisabled,
            ]}
            onPress={() => saveInspection(false)}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.text.onAccent} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isEditMode ? 'Update inspection' : 'Finalize Inspection'}
              </Text>
            )}
          </Pressable>

          {!isEditMode ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={() => saveInspection(true)}
              disabled={isSaving}>
              <Text style={styles.secondaryButtonText}>Save & Next</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createFormStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function createFormStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background.primary },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    formContent: { padding: 20, paddingTop: 8, gap: 16 },
    formHint: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    formCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 16,
      padding: 16,
      gap: 18,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    field: { gap: 8 },
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    input: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
    },
    textArea: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
      minHeight: 100,
    },
    rowTwo: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    switchText: { flex: 1, gap: 4 },
    switchLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    switchHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      lineHeight: 17,
    },
    videoButton: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.muted,
    },
    videoButtonPressed: { opacity: 0.85 },
    videoButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    primaryButton: {
      backgroundColor: colors.accent.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonPressed: { backgroundColor: colors.accent.primaryPressed },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onAccent,
    },
    secondaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    secondaryButtonPressed: { opacity: 0.7 },
    secondaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.secondary,
    },
  });
}

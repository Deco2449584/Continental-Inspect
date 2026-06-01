import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorPickerCarousel } from '@/components/ColorPickerCarousel';
import { EvidencePhotosField } from '@/components/EvidencePhotosField';
import { InfoModal } from '@/components/InfoModal';
import { OptionGroup } from '@/components/OptionGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useVehicleCatalog } from '@/context/VehicleCatalogContext';
import { useVehicles } from '@/context/VehiclesContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { Vehicle } from '@/types';
import { normalizeVin } from '@/utils/vin';

type FormMode = 'create' | 'admin-edit' | 'append';

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createScannerStyles);
  const { editId, appendId } = useLocalSearchParams<{ editId?: string; appendId?: string }>();
  const { isAdmin } = useAuth();
  const { catalog, isLoading: catalogLoading, getTypeLabel } = useVehicleCatalog();
  const {
    vehicles,
    isLoading: vehiclesLoading,
    findByVin,
    lookupVehicleByVin,
    addVehicle,
    updateVehicleById,
    appendVehicleById,
  } = useVehicles();
  const [permission, requestPermission] = useCameraPermissions();
  const scanHandledRef = useRef<string | null>(null);

  const [isScanning, setIsScanning] = useState(true);
  const [isResolvingVin, setIsResolvingVin] = useState(false);
  const [scannedVin, setScannedVin] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [existingComments, setExistingComments] = useState('');
  const [lockedPhotoUris, setLockedPhotoUris] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [vinModalVisible, setVinModalVisible] = useState(false);
  const [vinModalModel, setVinModalModel] = useState('');

  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [comments, setComments] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);

  useEffect(() => {
    if (catalogLoading || formMode !== 'create') return;
    if (!model && catalog.models[0]) setModel(catalog.models[0]);
    if (!type && catalog.types[0]) setType(catalog.types[0].value);
    if (!vehicleColor && catalog.colors[0]) setVehicleColor(catalog.colors[0]);
  }, [catalogLoading, catalog, model, type, vehicleColor, formMode]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const resetFormDefaults = useCallback(() => {
    setModel(catalog.models[0] ?? '');
    setType(catalog.types[0]?.value ?? '');
    setVehicleColor(catalog.colors[0] ?? '');
    setComments('');
    setEvidencePhotos([]);
    setEditingVehicleId(null);
    setFormMode('create');
    setExistingComments('');
    setLockedPhotoUris([]);
  }, [catalog]);

  const loadVehicleForAdminEdit = useCallback((vehicle: Vehicle) => {
    setFormMode('admin-edit');
    setEditingVehicleId(vehicle.id);
    setExistingComments('');
    setLockedPhotoUris([]);
    setScannedVin(vehicle.vin);
    setModel(vehicle.model);
    setType(vehicle.type);
    setVehicleColor(vehicle.color);
    setComments(vehicle.comments);
    setEvidencePhotos(vehicle.imagesUrls);
    setIsScanning(false);
  }, []);

  const loadVehicleForAppend = useCallback((vehicle: Vehicle) => {
    setFormMode('append');
    setEditingVehicleId(vehicle.id);
    setExistingComments(vehicle.comments);
    setLockedPhotoUris([...vehicle.imagesUrls]);
    setScannedVin(vehicle.vin);
    setModel(vehicle.model);
    setType('');                        // blank = no type change
    setVehicleColor(vehicle.color);
    setComments('');
    setEvidencePhotos(vehicle.imagesUrls);
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!editId || vehiclesLoading) return;
    if (!isAdmin) {
      Alert.alert('Not allowed', 'Only administrators can edit vehicle details.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    const existing = vehicles.find((vehicle) => vehicle.id === editId);
    if (existing) {
      loadVehicleForAdminEdit(existing);
    }
  }, [editId, isAdmin, vehicles, vehiclesLoading, loadVehicleForAdminEdit, router]);

  useEffect(() => {
    if (!appendId || vehiclesLoading) return;
    const existing = vehicles.find((vehicle) => vehicle.id === appendId);
    if (existing) {
      loadVehicleForAppend(existing);
    }
  }, [appendId, vehicles, vehiclesLoading, loadVehicleForAppend]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (!isScanning || !data || isResolvingVin) return;

      const vin = normalizeVin(data);
      if (scanHandledRef.current === vin) return;
      scanHandledRef.current = vin;

      setIsResolvingVin(true);
      setIsScanning(false);

      try {
        const existing = await lookupVehicleByVin(vin);
        if (existing) {
          loadVehicleForAppend(existing);
          setVinModalModel(existing.model);
          setVinModalVisible(true);
          return;
        }

        resetFormDefaults();
        setScannedVin(vin);
        setFormMode('create');
        setExistingComments('');
      } catch {
        Alert.alert('Error', 'Could not verify this VIN. Please try again.');
        setIsScanning(true);
        setScannedVin(null);
        scanHandledRef.current = null;
      } finally {
        setIsResolvingVin(false);
      }
    },
    [isScanning, isResolvingVin, lookupVehicleByVin, loadVehicleForAppend, resetFormDefaults],
  );

  const handleScanAgain = () => {
    scanHandledRef.current = null;
    setScannedVin(null);
    setIsScanning(true);
    resetFormDefaults();
  };

  const existingForVin = useMemo(
    () => (scannedVin ? findByVin(scannedVin) : null),
    [scannedVin, findByVin, vehicles],
  );

  const effectiveMode: FormMode =
    formMode === 'admin-edit' ? 'admin-edit' : existingForVin ? 'append' : formMode;

  const handleSave = async () => {
    if (!scannedVin?.trim() || isSaving) return;

    const payload = {
      model,
      type,
      color: vehicleColor,
      comments,
      imagesUrls: evidencePhotos,
    };

    setIsSaving(true);
    try {
      const appendTargetId = editingVehicleId ?? existingForVin?.id;
      if (effectiveMode === 'append' && appendTargetId) {
        await appendVehicleById(appendTargetId, {
          additionalComments: comments,
          imagesUrls: evidencePhotos,
          newType: type || undefined,
        });
      } else if (effectiveMode === 'admin-edit' && editingVehicleId) {
        if (!isAdmin) {
          Alert.alert('Not allowed', 'Only administrators can edit vehicle details.');
          setIsSaving(false);
          return;
        }
        await updateVehicleById(editingVehicleId, payload);
      } else {
        const duplicate = await lookupVehicleByVin(scannedVin);
        if (duplicate) {
          setIsSaving(false);
          loadVehicleForAppend(duplicate);
          setVinModalModel(duplicate.model);
          setVinModalVisible(true);
          return;
        }

        await addVehicle({
          vin: scannedVin,
          ...payload,
        });
      }
      router.replace('/(tabs)' as Href);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'DUPLICATE_VIN') {
        const duplicate = await lookupVehicleByVin(scannedVin);
        if (duplicate) {
          loadVehicleForAppend(duplicate);
          setVinModalModel(duplicate.model);
          setVinModalVisible(true);
        } else {
          Alert.alert('Duplicate VIN', 'This VIN is already registered.');
        }
      } else {
        Alert.alert('Error', 'Could not save the record. Please try again.');
      }
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera permission required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan the vehicle VIN QR code.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant permission</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const showForm = !isScanning && scannedVin !== null;

  const formTitle =
    effectiveMode === 'admin-edit'
      ? 'Edit inspection'
      : effectiveMode === 'append'
        ? 'Add to existing record'
        : 'New inspection';

  const formBottomPadding = Math.max(insets.bottom, 16) + 24;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      {isScanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.overlay}>
            <ScreenHeader
              variant="overlay"
              title="Scan VIN"
              subtitle={`${brand.name} · Point at QR code`}
              onBack={() => router.back()}
              backLabel="Back"
            />
            <Text style={styles.scanHint}>
              Align the QR code inside the frame
            </Text>
            <View style={styles.frameContainer}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
            {isResolvingVin ? (
              <View style={styles.resolvingOverlay}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.resolvingText}>Checking VIN...</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : showForm ? (
        <>
          <ScreenHeader
            title={formTitle}
            subtitle={scannedVin ?? undefined}
            onBack={() => router.back()}
            backLabel="Records"
          />
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <ScrollView
              contentContainerStyle={[styles.formContent, { paddingBottom: formBottomPadding }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
            {effectiveMode === 'append' ? (
              <Text style={styles.formHint}>
                Add a new service type (optional), comments or photos below.
              </Text>
            ) : null}

            <View style={styles.vinBox}>
              <Text style={styles.vinLabel}>VIN</Text>
              <TextInput
                style={styles.vinInput}
                value={scannedVin}
                editable={false}
                selectTextOnFocus
              />
            </View>

            <View style={styles.formCard}>
              {effectiveMode === 'append' ? (
                <View style={styles.readOnlyBlock}>
                  <Text style={styles.readOnlyLabel}>Model</Text>
                  <Text style={styles.readOnlyValue}>{model}</Text>

                  {/* Type history chain */}
                  <Text style={styles.readOnlyLabel}>Service history</Text>
                  <Text style={styles.typeChain}>
                    {existingForVin?.type ?? (editingVehicleId
                      ? vehicles.find(v => v.id === editingVehicleId)?.type
                      : '') ?? ''}
                    {type ? (
                      <Text style={styles.typeChainNew}>{`  +  ${getTypeLabel(type)}`}</Text>
                    ) : null}
                  </Text>

                  {/* New type selector */}
                  <OptionGroup
                    label="Add service type (optional)"
                    options={['', ...catalog.types.map((item) => item.value)]}
                    value={type}
                    onChange={setType}
                    getLabel={(option) => option === '' ? '— No change —' : getTypeLabel(option)}
                  />

                  <Text style={styles.readOnlyLabel}>Colour</Text>
                  <Text style={styles.readOnlyValue}>{vehicleColor}</Text>
                  {existingComments.trim() ? (
                    <>
                      <Text style={styles.readOnlyLabel}>Previous comments</Text>
                      <Text style={styles.readOnlyComments}>{existingComments}</Text>
                    </>
                  ) : null}
                </View>
              ) : (
                <>
                  <OptionGroup
                    label="Model"
                    options={catalog.models}
                    value={model}
                    onChange={setModel}
                  />

                  <OptionGroup
                    label="Type"
                    options={catalog.types.map((item) => item.value)}
                    value={type}
                    onChange={setType}
                    getLabel={(option) => getTypeLabel(option)}
                  />

                  <ColorPickerCarousel
                    label="Official Tesla colour"
                    options={catalog.colors}
                    value={vehicleColor}
                    onChange={setVehicleColor}
                  />
                </>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabelDark}>
                  {effectiveMode === 'append' ? 'Additional comments' : 'Comments'}
                </Text>
                <TextInput
                  style={styles.commentsInput}
                  value={comments}
                  onChangeText={setComments}
                  placeholder={
                    effectiveMode === 'append'
                      ? 'New inspection notes...'
                      : 'Inspection notes...'
                  }
                  placeholderTextColor={colors.text.onSurfaceMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <EvidencePhotosField
                photos={evidencePhotos}
                onChange={setEvidencePhotos}
                isAdmin={isAdmin}
                lockedPhotoUris={
                  !isAdmin && effectiveMode === 'append' ? lockedPhotoUris : []
                }
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSaving) && styles.primaryButtonPressed,
                isSaving && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.text.onAccent} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {effectiveMode === 'append'
                    ? 'Save update'
                    : effectiveMode === 'admin-edit'
                      ? 'Update record'
                      : 'Save & Continue'}
                </Text>
              )}
            </Pressable>

            {effectiveMode === 'create' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={handleScanAgain}>
                <Text style={styles.secondaryButtonText}>Scan again</Text>
              </Pressable>
            ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      ) : null}

      <InfoModal
        visible={vinModalVisible}
        icon="car-outline"
        title="VIN already registered"
        message={`${vinModalModel ? `${vinModalModel} is` : 'This vehicle is'} already in the system. You can add a new service type, comments or photos below.`}
        confirmLabel="Continue"
        onConfirm={() => setVinModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

function createScannerStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  scanHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
    fontFamily: fonts.body,
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.accent.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContent: {
    padding: 20,
    paddingTop: 8,
    gap: 16,
  },
  formHint: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  readOnlyBlock: {
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.onSurface,
    marginBottom: 4,
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.onSurfaceMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onSurface,
  },
  readOnlyComments: {
    fontSize: 14,
    color: colors.text.onSurfaceMuted,
    lineHeight: 20,
  },
  typeChain: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.onSurface,
    lineHeight: 22,
  },
  typeChainNew: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  vinBox: {
    gap: 6,
  },
  vinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vinInput: {
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.text.onSurface,
  },
  field: {
    gap: 8,
  },
  formCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 20,
    borderWidth: 1,
    borderColor: colors.border.onSurface,
  },
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resolvingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  fieldLabelDark: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.onSurface,
  },
  commentsInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.onSurface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.onSurface,
    minHeight: 100,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accent.primaryPressed,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
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
  secondaryButtonPressed: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  });
}

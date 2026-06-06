import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InfoModal } from '@/components/InfoModal';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import {
  MAX_PHOTOS_MODAL,
  PHOTO_TOO_LARGE_MODAL,
  isPhotoSizeAllowed,
} from '@/utils/evidenceMediaValidation';
import {
  compressPhotoEvidenceUri,
  formatMaxPhotoSizeMb,
} from '@/utils/compressPhotoEvidence';

export const MAX_PHOTO_EVIDENCE = 3;

const IMAGE_PICKER_OPTIONS: Pick<
  ImagePicker.ImagePickerOptions,
  'mediaTypes' | 'allowsEditing'
> = {
  mediaTypes: ['images'],
  allowsEditing: false,
};

type ValidationModalState = {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
} | null;

type EvidencePhotosFieldProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
  /** When false, URIs in lockedPhotoUris cannot be removed from the gallery. */
  isAdmin?: boolean;
  /** Photos already saved on the record (operators may not delete these). */
  lockedPhotoUris?: readonly string[];
};

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Camera permission',
      'We need camera access to capture photo evidence.',
    );
    return false;
  }
  return true;
}

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Photo library permission',
      'We need photo library access to select photo evidence.',
    );
    return false;
  }
  return true;
}

const THUMB_SIZE = 88;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    hint: {
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.accent.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    actionButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    actionButtonDisabled: {
      opacity: 0.45,
    },
    actionButtonPressed: {
      opacity: 0.75,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onAccent,
    },
    actionButtonTextSecondary: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    thumbnails: {
      gap: 10,
      paddingVertical: 4,
    },
    thumbnailWrap: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.surface.muted,
    },
    thumbnail: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
    },
    removeBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 18,
    },
    empty: {
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      fontStyle: 'italic',
    },
    countHint: {
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
    },
    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surface.muted,
    },
    processingText: {
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
    },
  });
}

export function EvidencePhotosField({
  photos,
  onChange,
  isAdmin = false,
  lockedPhotoUris = [],
}: EvidencePhotosFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const lockedSet = useMemo(() => new Set(lockedPhotoUris), [lockedPhotoUris]);
  const [validationModal, setValidationModal] = useState<ValidationModalState>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const atPhotoLimit = photos.length >= MAX_PHOTO_EVIDENCE;
  const remainingSlots = Math.max(0, MAX_PHOTO_EVIDENCE - photos.length);

  const canRemovePhoto = (uri: string) => isAdmin || !lockedSet.has(uri);

  const showMaxPhotosModal = () => {
    setValidationModal(MAX_PHOTOS_MODAL);
  };

  const showPhotoTooLargeModal = () => {
    setValidationModal(PHOTO_TOO_LARGE_MODAL);
  };

  const commitAcceptedPhotos = (acceptedUris: string[]) => {
    if (acceptedUris.length === 0) return;

    const slotsLeft = MAX_PHOTO_EVIDENCE - photos.length;
    if (slotsLeft <= 0) {
      showMaxPhotosModal();
      return;
    }

    const toAdd = acceptedUris.slice(0, slotsLeft);
    if (acceptedUris.length > toAdd.length) {
      showMaxPhotosModal();
    }
    onChange([...photos, ...toAdd]);
  };

  const processPickedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const accepted: string[] = [];
    let showedRejectionModal = false;

    setIsProcessing(true);
    try {
      for (const asset of assets) {
        if (!asset.uri) continue;

        if (photos.length + accepted.length >= MAX_PHOTO_EVIDENCE) {
          showMaxPhotosModal();
          break;
        }

        try {
          const optimizedUri = await compressPhotoEvidenceUri(asset.uri);
          const allowed = await isPhotoSizeAllowed(optimizedUri);
          if (!allowed) {
            if (!showedRejectionModal) {
              showPhotoTooLargeModal();
              showedRejectionModal = true;
            }
            continue;
          }
          accepted.push(optimizedUri);
        } catch {
          if (!showedRejectionModal) {
            showPhotoTooLargeModal();
            showedRejectionModal = true;
          }
        }
      }

      commitAcceptedPhotos(accepted);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    if (atPhotoLimit || isProcessing) {
      if (atPhotoLimit) showMaxPhotosModal();
      return;
    }

    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);

    if (!result.canceled && result.assets.length > 0) {
      await processPickedAssets(result.assets);
    }
  };

  const handlePickFromGallery = async () => {
    if (atPhotoLimit || isProcessing) {
      if (atPhotoLimit) showMaxPhotosModal();
      return;
    }

    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      allowsMultipleSelection: remainingSlots > 1,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      await processPickedAssets(result.assets);
    }
  };

  const handleRemove = (uri: string) => {
    if (!canRemovePhoto(uri)) {
      Alert.alert(
        'Not allowed',
        'Only administrators can remove photos already saved on this record.',
      );
      return;
    }
    onChange(photos.filter((item) => item !== uri));
  };

  return (
    <View style={styles.container}>
      <InfoModal
        visible={validationModal != null}
        icon={validationModal?.icon ?? 'alert-circle-outline'}
        title={validationModal?.title ?? ''}
        message={validationModal?.message ?? ''}
        onConfirm={() => setValidationModal(null)}
      />

      <Text style={styles.label}>Photo evidence</Text>
      <Text style={styles.hint}>
        Max {MAX_PHOTO_EVIDENCE} photos · auto-optimized to WebP (≤{formatMaxPhotoSizeMb()} each)
      </Text>
      <Text style={styles.countHint}>
        {photos.length} / {MAX_PHOTO_EVIDENCE} photos
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            (atPhotoLimit || isProcessing) && styles.actionButtonDisabled,
            pressed && !atPhotoLimit && !isProcessing && styles.actionButtonPressed,
          ]}
          onPress={() => void handleTakePhoto()}
          disabled={atPhotoLimit || isProcessing}>
          <Text style={styles.actionButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            (atPhotoLimit || isProcessing) && styles.actionButtonDisabled,
            pressed && !atPhotoLimit && !isProcessing && styles.actionButtonPressed,
          ]}
          onPress={() => void handlePickFromGallery()}
          disabled={atPhotoLimit || isProcessing}>
          <Text style={styles.actionButtonTextSecondary}>Gallery</Text>
        </Pressable>
      </View>

      {isProcessing ? (
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.processingText}>Optimizing photos…</Text>
        </View>
      ) : null}

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnails}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbnailWrap}>
              <Image
                source={{ uri }}
                style={styles.thumbnail}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={uri}
              />
              {canRemovePhoto(uri) ? (
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)}>
                  <Text style={styles.removeBtnText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No photos yet</Text>
      )}
    </View>
  );
}

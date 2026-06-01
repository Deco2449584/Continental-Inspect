import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InfoModal } from '@/components/InfoModal';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';

export const MAX_PHOTO_EVIDENCE = 3;
const PHOTO_QUALITY = 0.3;

const IMAGE_PICKER_OPTIONS: Pick<
  ImagePicker.ImagePickerOptions,
  'mediaTypes' | 'quality' | 'allowsEditing'
> = {
  mediaTypes: ['images'],
  quality: PHOTO_QUALITY,
  allowsEditing: false,
};

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
  });
}

export function EvidencePhotosField({
  photos,
  onChange,
  isAdmin = false,
  lockedPhotoUris = [],
}: EvidencePhotosFieldProps) {
  const styles = useThemedStyles(createStyles);
  const lockedSet = useMemo(() => new Set(lockedPhotoUris), [lockedPhotoUris]);
  const [storageModalVisible, setStorageModalVisible] = useState(false);

  const atPhotoLimit = photos.length >= MAX_PHOTO_EVIDENCE;
  const remainingSlots = Math.max(0, MAX_PHOTO_EVIDENCE - photos.length);

  const canRemovePhoto = (uri: string) => isAdmin || !lockedSet.has(uri);

  const appendPhotos = (uris: string[]) => {
    if (uris.length === 0) return;
    if (remainingSlots <= 0) {
      Alert.alert(
        'Photo limit',
        `You can attach up to ${MAX_PHOTO_EVIDENCE} photos per inspection.`,
      );
      return;
    }

    const toAdd = uris.slice(0, remainingSlots);
    if (uris.length > toAdd.length) {
      Alert.alert(
        'Photo limit',
        `Only ${remainingSlots} more photo(s) were added (max ${MAX_PHOTO_EVIDENCE}).`,
      );
    }
    onChange([...photos, ...toAdd]);
  };

  const launchCamera = async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);

    if (!result.canceled && result.assets[0]?.uri) {
      appendPhotos([result.assets[0].uri]);
    }
  };

  const handleTakePhotoPress = () => {
    if (atPhotoLimit) {
      Alert.alert(
        'Photo limit',
        `You already have ${MAX_PHOTO_EVIDENCE} photos. Remove one to add another.`,
      );
      return;
    }
    setStorageModalVisible(true);
  };

  const handleStorageModalConfirm = () => {
    setStorageModalVisible(false);
    void launchCamera();
  };

  const handlePickFromGallery = async () => {
    if (atPhotoLimit) {
      Alert.alert(
        'Photo limit',
        `You already have ${MAX_PHOTO_EVIDENCE} photos. Remove one to add another.`,
      );
      return;
    }

    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      allowsMultipleSelection: remainingSlots > 1,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled) {
      appendPhotos(result.assets.map((asset) => asset.uri).filter(Boolean));
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
        visible={storageModalVisible}
        icon="cloud-upload-outline"
        title="Storage limits"
        message="Storage Limits: Please capture a maximum of 3 compressed photos to save bandwidth."
        confirmLabel="Continue"
        onConfirm={handleStorageModalConfirm}
      />

      <Text style={styles.label}>Photo evidence</Text>
      <Text style={styles.hint}>
        Take or select photos of the cargo / ULD condition (max {MAX_PHOTO_EVIDENCE}, compressed)
      </Text>
      <Text style={styles.countHint}>
        {photos.length} / {MAX_PHOTO_EVIDENCE} photos
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            atPhotoLimit && styles.actionButtonDisabled,
            pressed && !atPhotoLimit && styles.actionButtonPressed,
          ]}
          onPress={handleTakePhotoPress}
          disabled={atPhotoLimit}>
          <Text style={styles.actionButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            atPhotoLimit && styles.actionButtonDisabled,
            pressed && !atPhotoLimit && styles.actionButtonPressed,
          ]}
          onPress={handlePickFromGallery}
          disabled={atPhotoLimit}>
          <Text style={styles.actionButtonTextSecondary}>Gallery</Text>
        </Pressable>
      </View>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnails}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbnailWrap}>
              <Image source={{ uri }} style={styles.thumbnail} contentFit="cover" />
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

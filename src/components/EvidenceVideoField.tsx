import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InfoModal } from '@/components/InfoModal';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import {
  MAX_VIDEO_DURATION_SEC,
  validateVideoAsset,
  VIDEO_TOO_LONG_MODAL,
} from '@/utils/evidenceMediaValidation';

const VIDEO_QUALITY = 0;

const VIDEO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['videos'],
  videoMaxDuration: MAX_VIDEO_DURATION_SEC,
  quality: VIDEO_QUALITY,
  allowsEditing: false,
};

type EvidenceVideoFieldProps = {
  videos: string[];
  onChange: (videos: string[]) => void;
};

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Camera permission',
      'We need camera access to record video evidence.',
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
      'We need media library access to select video evidence.',
    );
    return false;
  }
  return true;
}

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
    list: {
      gap: 8,
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surface.muted,
    },
    rowLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text.onSurface,
    },
    removeBtn: {
      padding: 4,
    },
    empty: {
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      fontStyle: 'italic',
    },
  });
}

export function EvidenceVideoField({ videos, onChange }: EvidenceVideoFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [showVideoTooLongModal, setShowVideoTooLongModal] = useState(false);

  const tryAppendVideoAsset = (asset: ImagePicker.ImagePickerAsset | undefined) => {
    if (!asset?.uri) return;

    if (!validateVideoAsset(asset)) {
      setShowVideoTooLongModal(true);
      return;
    }

    onChange([...videos, asset.uri]);
  };

  const handleRecordVideo = async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync(VIDEO_PICKER_OPTIONS);

    if (!result.canceled && result.assets[0]) {
      tryAppendVideoAsset(result.assets[0]);
    }
  };

  const handlePickFromLibrary = async () => {
    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...VIDEO_PICKER_OPTIONS,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      tryAppendVideoAsset(result.assets[0]);
    }
  };

  const handleRemove = (uri: string) => {
    onChange(videos.filter((item) => item !== uri));
  };

  return (
    <View style={styles.container}>
      <InfoModal
        visible={showVideoTooLongModal}
        icon={VIDEO_TOO_LONG_MODAL.icon}
        title={VIDEO_TOO_LONG_MODAL.title}
        message={VIDEO_TOO_LONG_MODAL.message}
        onConfirm={() => setShowVideoTooLongModal(false)}
      />

      <Text style={styles.label}>Video evidence</Text>
      <Text style={styles.hint}>
        Record or upload a clip (max {MAX_VIDEO_DURATION_SEC}s, compressed)
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={() => void handleRecordVideo()}>
          <Text style={styles.actionButtonText}>Record video</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => void handlePickFromLibrary()}>
          <Text style={styles.actionButtonTextSecondary}>Upload video</Text>
        </Pressable>
      </View>

      {videos.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {videos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.row}>
              <Ionicons name="videocam" size={20} color={colors.text.onSurface} />
              <Text style={styles.rowLabel} numberOfLines={1}>
                Video {index + 1}
                {uri.startsWith('http') ? ' (saved)' : ' (pending upload)'}
              </Text>
              <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)}>
                <Ionicons name="close-circle" size={22} color="#c62828" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No videos yet</Text>
      )}
    </View>
  );
}

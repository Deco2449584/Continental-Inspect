import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InfoModal } from '@/components/InfoModal';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { downloadVideoEvidenceToGallery } from '@/utils/downloadVideoEvidence';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_WIDTH = SCREEN_WIDTH - 72;
const VIDEO_HEIGHT = 200;

type CargoVideoEvidenceItemProps = {
  videoUrl: string;
  index: number;
  total: number;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: 10,
    },
    indexLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
    },
    playerShell: {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#0a0a0a',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      alignSelf: 'center',
    },
    video: {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.muted,
    },
    downloadBtnPressed: {
      opacity: 0.85,
    },
    downloadBtnDisabled: {
      opacity: 0.55,
    },
    downloadBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
  });
}

export function CargoVideoEvidenceItem({ videoUrl, index, total }: CargoVideoEvidenceItemProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.loop = false;
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const isBuffering = status === 'loading';

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const result = await downloadVideoEvidenceToGallery(videoUrl, index);

      if (result.ok) {
        setShowSuccessModal(true);
        return;
      }

      if (result.reason === 'permission_denied') {
        Alert.alert(
          'Gallery access required',
          'Continental Inspect needs permission to save downloaded video evidence to your device gallery. Enable Photos/Media access in system settings.',
        );
        return;
      }

      Alert.alert(
        'Download failed',
        'Could not download or save this video. Check your connection and try again.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <InfoModal
        visible={showSuccessModal}
        icon="checkmark-circle-outline"
        title="Success"
        message="Success: Video successfully saved to your gallery."
        onConfirm={() => setShowSuccessModal(false)}
      />

      <View style={styles.playerShell}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          contentFit="contain"
          allowsFullscreen
        />
        {isBuffering ? (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : null}
      </View>

      <Text style={styles.indexLabel}>
        Video {index + 1} / {total}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.downloadBtn,
          pressed && !isDownloading && styles.downloadBtnPressed,
          isDownloading && styles.downloadBtnDisabled,
        ]}
        onPress={() => void handleDownload()}
        disabled={isDownloading}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.text.onSurface} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.text.onSurface} />
        )}
        <Text style={styles.downloadBtnText}>
          {isDownloading ? 'Downloading…' : 'Download Video Evidence'}
        </Text>
      </Pressable>
    </View>
  );
}

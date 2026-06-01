import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
const CLIP_CARD_WIDTH = 108;
const CLIP_CARD_HEIGHT = 76;

type CargoVideoEvidenceSectionProps = {
  videoUrls: readonly string[];
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    section: {
      gap: 12,
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
    carousel: {
      gap: 10,
      paddingVertical: 2,
    },
    clipCard: {
      width: CLIP_CARD_WIDTH,
      height: CLIP_CARD_HEIGHT,
      borderRadius: 10,
      backgroundColor: '#0a0a0a',
      borderWidth: 2,
      borderColor: colors.border.onSurface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 8,
    },
    clipCardSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: `${colors.accent.primary}18`,
    },
    clipCardPressed: {
      opacity: 0.85,
    },
    clipLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.text.onSurface,
    },
    clipLabelSelected: {
      color: colors.accent.primary,
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

type CargoVideoPlayerProps = {
  videoUrl: string;
};

function CargoVideoPlayer({ videoUrl }: CargoVideoPlayerProps) {
  const styles = useThemedStyles(createStyles);

  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.loop = false;
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const isBuffering = status === 'loading';

  return (
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
  );
}

export function CargoVideoEvidenceSection({ videoUrls }: CargoVideoEvidenceSectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const videoUrlsKey = videoUrls.join('\n');

  useEffect(() => {
    setSelectedVideoIndex(0);
  }, [videoUrlsKey]);

  useEffect(() => {
    setSelectedVideoIndex((current) =>
      Math.min(current, Math.max(0, videoUrls.length - 1)),
    );
  }, [videoUrls.length]);

  const safeIndex = Math.min(selectedVideoIndex, Math.max(0, videoUrls.length - 1));
  const selectedVideoUrl = videoUrls[safeIndex];
  const total = videoUrls.length;
  const showCarousel = total > 1;

  const handleDownload = async () => {
    if (isDownloading || !selectedVideoUrl) return;

    setIsDownloading(true);
    try {
      const result = await downloadVideoEvidenceToGallery(selectedVideoUrl, safeIndex);

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

  if (!selectedVideoUrl) {
    return null;
  }

  return (
    <View style={styles.section}>
      <InfoModal
        visible={showSuccessModal}
        icon="checkmark-circle-outline"
        title="Success"
        message="Success: Video successfully saved to your gallery."
        onConfirm={() => setShowSuccessModal(false)}
      />

      <CargoVideoPlayer key={selectedVideoUrl} videoUrl={selectedVideoUrl} />

      <Text style={styles.indexLabel}>
        Clip {safeIndex + 1} / {total}
      </Text>

      {showCarousel ? (
        <FlatList
          data={videoUrls}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item, index }) => {
            const isSelected = index === safeIndex;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Clip ${index + 1}`}
                style={({ pressed }) => [
                  styles.clipCard,
                  isSelected && styles.clipCardSelected,
                  pressed && styles.clipCardPressed,
                  index < total - 1 && { marginRight: 10 },
                ]}
                onPress={() => setSelectedVideoIndex(index)}>
                <Ionicons
                  name="play-circle"
                  size={28}
                  color={isSelected ? colors.accent.primary : colors.text.onSurfaceMuted}
                />
                <Text style={[styles.clipLabel, isSelected && styles.clipLabelSelected]}>
                  Clip {index + 1}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}

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

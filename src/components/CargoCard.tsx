import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspection } from '@/types';
import { getConservationLabel } from '@/utils/cargoLabels';
import { formatInspectionDate } from '@/utils/formatDate';

type CargoCardProps = {
  inspection: CargoInspection;
  onPress?: () => void;
};

const THUMB = 48;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    cardPressed: {
      opacity: 0.85,
    },
    accentBar: {
      width: 3,
      backgroundColor: ACCENT,
    },
    body: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
      backgroundColor: colors.surface.muted,
    },
    iconWrap: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
      backgroundColor: ACCENT_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainCol: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    uldId: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 17,
      color: colors.text.onSurface,
      letterSpacing: 0.2,
    },
    awb: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      marginTop: 1,
    },
    metaLine: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurface,
      marginTop: 2,
    },
    conservation: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    date: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
      flexShrink: 1,
      textAlign: 'right',
    },
    mediaHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    mediaHintText: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
    },
  });
}

export function CargoCard({ inspection, onPress }: CargoCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;

  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  const loaded = !inspection.hasIssues;
  const statusBg = loaded ? `${colors.accent.primary}22` : 'rgba(245, 158, 11, 0.22)';
  const statusColor = loaded ? colors.accent.primary : colors.semantic.warning;
  const statusLabel = loaded ? 'LOADED' : 'REQUIRES ATTENTION';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.accentBar} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons name="cube-outline" size={22} color={colors.accent.primary} />
            </View>
          )}

          <View style={styles.mainCol}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.uldId} numberOfLines={1}>
                  {inspection.uldId}
                </Text>
                <Text style={styles.awb} numberOfLines={1}>
                  AWB {inspection.awbNumber}
                </Text>
              </View>
              {onPress ? (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.text.onSurfaceMuted}
                />
              ) : null}
            </View>

            <Text style={styles.metaLine} numberOfLines={1}>
              {inspection.foodType}
            </Text>
            <Text style={styles.conservation} numberOfLines={1}>
              {getConservationLabel(inspection.conservationType)} · {inspection.weightKg} kg ·{' '}
              {inspection.boxCount} boxes
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <View style={styles.mediaHint}>
            {mediaCount > 0 ? (
              <>
                <Ionicons name="attach-outline" size={12} color={colors.text.onSurfaceMuted} />
                <Text style={styles.mediaHintText}>{mediaCount}</Text>
              </>
            ) : null}
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

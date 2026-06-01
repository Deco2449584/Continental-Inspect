import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useVehicleCatalog } from '@/context/VehicleCatalogContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { Vehicle } from '@/types';
import { formatVehicleDate } from '@/utils/formatDate';
import { getTypeColor } from '@/utils/vehicleLabels';

type VehicleCardProps = {
  vehicle: Vehicle;
  onPress?: () => void;
};

const THUMB = 56;
const RED = '#E21F28';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    cardPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.985 }],
    },

    // ── Red accent bar on the left ──────────────────────────────────────────
    accentBar: {
      width: 3,
      backgroundColor: RED,
    },

    // ── Main content ────────────────────────────────────────────────────────
    body: {
      flex: 1,
      padding: 13,
      gap: 9,
    },

    // ── Top row: icon/thumb + text + chevron ────────────────────────────────
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    // Thumbnail (when photos exist)
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: 10,
      backgroundColor: colors.surface.muted,
    },

    // Fallback icon wrap (when no photos)
    iconWrap: {
      width: THUMB,
      height: THUMB,
      borderRadius: 10,
      backgroundColor: 'rgba(226,31,40,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    titleBlock: {
      flex: 1,
      gap: 1,
    },
    model: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onSurface,
      letterSpacing: -0.1,
    },
    vin: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      letterSpacing: 0.4,
      marginTop: 1,
    },

    // ── Meta row: color dot + color name + date ─────────────────────────────
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 1,
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    colorName: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      flex: 1,
    },
    date: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },

    // ── Badges row ──────────────────────────────────────────────────────────
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
    },
    photoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.surface.muted,
    },
    photoBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
  });
}

/** Maps a color name to a rough CSS color for the dot. Best-effort. */
function colorNameToHex(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('white') || n.includes('pearl'))  return '#F5F5F0';
  if (n.includes('black') || n.includes('stealth')) return '#1A1A1A';
  if (n.includes('blue'))  return '#1D4ED8';
  if (n.includes('red') || n.includes('ultra'))    return '#DC2626';
  if (n.includes('grey') || n.includes('gray') || n.includes('silver') || n.includes('quicksilver')) return '#9CA3AF';
  if (n.includes('green')) return '#16A34A';
  if (n.includes('gold') || n.includes('yellow'))  return '#CA8A04';
  if (n.includes('brown') || n.includes('bronze')) return '#92400E';
  return '#6B7280';
}

export function VehicleCard({ vehicle, onPress }: VehicleCardProps) {
  const { getTypeLabel } = useVehicleCatalog();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const typeStyle = getTypeColor(vehicle.type);

  const hasPhotos = vehicle.imagesUrls.length > 0;
  const thumbUri  = hasPhotos ? vehicle.imagesUrls[0] : null;
  const dotColor  = colorNameToHex(vehicle.color);

  // Show "Updated" date if available, otherwise "Registered"
  const dateLabel = vehicle.updatedAt
    ? `Updated ${formatVehicleDate(vehicle.updatedAt)}`
    : `Registered ${formatVehicleDate(vehicle.createdAt)}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={!onPress}>

      {/* Left accent bar */}
      <View style={styles.accentBar} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          {/* Thumbnail or icon */}
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumb}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons name="car-sport" size={24} color={colors.accent.primary} />
            </View>
          )}

          {/* Model + VIN */}
          <View style={styles.titleBlock}>
            <Text style={styles.model} numberOfLines={1}>
              {vehicle.model}
            </Text>
            <Text style={styles.vin} numberOfLines={1}>
              {vehicle.vin}
            </Text>

            {/* Color dot + name + date */}
            <View style={styles.metaRow}>
              <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
              <Text style={styles.colorName} numberOfLines={1}>
                {vehicle.color}
              </Text>
              <Text style={styles.date}>{dateLabel}</Text>
            </View>
          </View>

          {/* Chevron */}
          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text.onSurfaceMuted}
            />
          ) : null}
        </View>

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: typeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: typeStyle.text }]}>
              {getTypeLabel(vehicle.type)}
            </Text>
          </View>

          {hasPhotos ? (
            <View style={styles.photoBadge}>
              <Ionicons name="camera-outline" size={11} color={colors.text.onSurfaceMuted} />
              <Text style={styles.photoBadgeText}>
                {vehicle.imagesUrls.length} photo{vehicle.imagesUrls.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

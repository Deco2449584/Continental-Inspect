import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type TextStyle,
    type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useVehicleCatalog } from '@/context/VehicleCatalogContext';
import { useVehicles } from '@/context/VehiclesContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { formatVehicleDate } from '@/utils/formatDate';
import { getTypeColor } from '@/utils/vehicleLabels';
import { shareVehiclePdf } from '@/utils/vehiclePdf';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 40;
const PHOTO_HEIGHT = 220;

function createDetailStyles(colors: AppColors) {
  return StyleSheet.create({
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
    flex: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 14,
    },
    heroCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    heroModel: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.text.onSurface,
    },
    heroVin: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      letterSpacing: 0.3,
    },
    heroMeta: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    row: {
      gap: 4,
    },
    rowLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rowValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.onSurface,
    },
    comments: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text.onSurface,
    },
    gallery: {
      gap: 12,
      paddingVertical: 4,
    },
    photoWrap: {
      width: PHOTO_WIDTH,
      gap: 6,
    },
    photo: {
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
      borderRadius: 12,
      backgroundColor: colors.surface.muted,
    },
    photoIndex: {
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
    },
    noPhotos: {
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      fontStyle: 'italic',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border.default,
      backgroundColor: colors.background.primary,
    },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent.primary,
      backgroundColor: 'rgba(226, 31, 40, 0.08)',
    },
    footerBtnPressed: {
      opacity: 0.85,
    },
    footerBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.accent.primary,
    },
    footerBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent.primary,
    },
    footerBtnPrimaryPressed: {
      backgroundColor: colors.accent.primaryPressed,
    },
    footerBtnPrimaryText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onAccent,
    },
    footerBtnOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
    },
    footerBtnOutlinePressed: {
      backgroundColor: 'rgba(226, 31, 40, 0.08)',
    },
    footerBtnOutlineText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.accent.primary,
    },
    notFound: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    notFoundTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
    },
    headerIconBtn: {
      padding: 4,
    },
  });
}

function DetailRow({
  label,
  value,
  rowStyle,
  labelStyle,
  valueStyle,
}: {
  label: string;
  value: string;
  rowStyle: ViewStyle;
  labelStyle: TextStyle;
  valueStyle: TextStyle;
}) {
  return (
    <View style={rowStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

function Badge({
  label,
  backgroundColor,
  textColor,
  badgeStyle,
  badgeTextStyle,
}: {
  label: string;
  backgroundColor: string;
  textColor: string;
  badgeStyle: ViewStyle;
  badgeTextStyle: TextStyle;
}) {
  return (
    <View style={[badgeStyle, { backgroundColor }]}>
      <Text style={[badgeTextStyle, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export default function VehicleDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createDetailStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { getTypeLabel } = useVehicleCatalog();
  const { vehicles, isLoading } = useVehicles();
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const vehicle = useMemo(
    () => vehicles.find((item) => item.id === id),
    [vehicles, id],
  );

  const handleAdminEdit = () => {
    if (!vehicle || !isAdmin) return;
    router.push({
      pathname: '/scanner',
      params: { editId: vehicle.id },
    } as Href);
  };

  const handleAppendUpdate = () => {
    if (!vehicle) return;
    router.push({
      pathname: '/scanner',
      params: { appendId: vehicle.id },
    } as Href);
  };

  const handleExportPdf = async () => {
    if (!vehicle) return;
    setIsPdfLoading(true);
    try {
      await shareVehiclePdf(vehicle);
    } catch {
      Alert.alert('PDF failed', 'Could not generate or share the report. Please try again.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
          <ScreenHeader title="Record" onBack={() => router.back()} />
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Record not found</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const typeStyle = getTypeColor(vehicle.type);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScreenHeader
          title="Vehicle details"
          subtitle={brand.name}
          onBack={() => router.back()}
          backLabel="Records"
          rightElement={
            isAdmin ? (
              <Pressable onPress={handleAdminEdit} hitSlop={12} style={styles.headerIconBtn}>
                <Ionicons name="create-outline" size={24} color={colors.accent.primary} />
              </Pressable>
            ) : null
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroModel}>{vehicle.model}</Text>
            <Text style={styles.heroVin}>VIN · {vehicle.vin}</Text>
            <Text style={styles.heroMeta}>
              Registered {formatVehicleDate(vehicle.createdAt)}
              {vehicle.updatedAt ? ` · Updated ${formatVehicleDate(vehicle.updatedAt)}` : ''}
            </Text>
            <View style={styles.badges}>
              <Badge
                label={getTypeLabel(vehicle.type)}
                backgroundColor={typeStyle.bg}
                textColor={typeStyle.text}
                badgeStyle={styles.badge}
                badgeTextStyle={styles.badgeText}
              />
            </View>
          </View>

          <View style={styles.card}>
            {isAdmin && vehicle.createdByEmail ? (
              <DetailRow
                label="Operator"
                value={vehicle.createdByEmail}
                rowStyle={styles.row}
                labelStyle={styles.rowLabel}
                valueStyle={styles.rowValue}
              />
            ) : null}
            <DetailRow
              label="Model"
              value={vehicle.model}
              rowStyle={styles.row}
              labelStyle={styles.rowLabel}
              valueStyle={styles.rowValue}
            />
            <DetailRow
              label="Type"
              value={getTypeLabel(vehicle.type)}
              rowStyle={styles.row}
              labelStyle={styles.rowLabel}
              valueStyle={styles.rowValue}
            />
            <DetailRow
              label="Colour"
              value={vehicle.color}
              rowStyle={styles.row}
              labelStyle={styles.rowLabel}
              valueStyle={styles.rowValue}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Comments</Text>
            <Text style={styles.comments}>
              {vehicle.comments.trim() || 'No comments recorded.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Photo evidence ({vehicle.imagesUrls.length})
            </Text>
            {vehicle.imagesUrls.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}>
                {vehicle.imagesUrls.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                    <Text style={styles.photoIndex}>
                      {index + 1} / {vehicle.imagesUrls.length}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noPhotos}>No photos attached to this record.</Text>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isAdmin ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.footerBtnPrimary,
                  pressed && styles.footerBtnPrimaryPressed,
                ]}
                onPress={handleAdminEdit}>
                <Ionicons name="create-outline" size={20} color={colors.text.onAccent} />
                <Text style={styles.footerBtnPrimaryText}>Edit record</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.footerBtnOutline,
                  pressed && styles.footerBtnOutlinePressed,
                ]}
                onPress={handleExportPdf}
                disabled={isPdfLoading}>
                {isPdfLoading ? (
                  <ActivityIndicator color={colors.accent.primary} />
                ) : (
                  <>
                    <Ionicons name="document-outline" size={22} color={colors.accent.primary} />
                    <Text style={styles.footerBtnOutlineText}>Export PDF report</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}
              onPress={handleAppendUpdate}>
              <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
              <Text style={styles.footerBtnText}>Add photos & comments</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

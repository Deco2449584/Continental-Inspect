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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CargoVideoEvidenceSection } from '@/components/CargoVideoEvidenceSection';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { shareCargoInspectionPdf } from '@/utils/cargoInspectionPdf';
import { getConservationLabel } from '@/utils/cargoLabels';
import { formatInspectionDate } from '@/utils/formatDate';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 40;
const PHOTO_HEIGHT = 200;

function createDetailStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background.primary },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 14 },
    heroCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    heroUld: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.text.onSurface,
    },
    heroAwb: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
    },
    heroMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      marginTop: 4,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      marginTop: 4,
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    row: { gap: 4 },
    rowLabel: {
      fontSize: 11,
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
      fontFamily: fonts.headingSemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    issueText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text.onSurface,
    },
    gallery: { gap: 12, paddingVertical: 4 },
    photoWrap: { width: PHOTO_WIDTH, gap: 6 },
    photo: {
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
      borderRadius: 12,
      backgroundColor: colors.surface.muted,
    },
    photoIndex: { fontSize: 12, color: colors.text.onSurfaceMuted, textAlign: 'center' },
    noMedia: {
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      fontStyle: 'italic',
    },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    notFoundTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    headerIconBtn: { padding: 4 },
    pdfBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
    },
    pdfBarPressed: { backgroundColor: 'rgba(2, 101, 220, 0.08)' },
    pdfBarDisabled: { opacity: 0.6 },
    pdfBarText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.accent.primary,
    },
  });
}

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createDetailStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CargoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createDetailStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { inspections, isLoading } = useCargoInspections();
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const inspection = useMemo(
    () => inspections.find((item) => item.id === id),
    [inspections, id],
  );

  const handleEdit = () => {
    if (!inspection || !isAdmin) return;
    router.push({
      pathname: '/scanner',
      params: { editId: inspection.id },
    } as Href);
  };

  const handleExportPdf = async () => {
    if (!inspection) return;
    setIsPdfLoading(true);
    try {
      await shareCargoInspectionPdf(inspection);
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

  if (!inspection) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
          <ScreenHeader title="Inspection" onBack={() => router.back()} />
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Inspection not found</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const loaded = !inspection.hasIssues;
  const statusBg = loaded ? `${colors.accent.primary}22` : 'rgba(245, 158, 11, 0.22)';
  const statusColor = loaded ? colors.accent.primary : colors.semantic.warning;
  const statusLabel = loaded ? 'LOADED' : 'REQUIRES ATTENTION';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScreenHeader
          title="Cargo inspection"
          subtitle={brand.name}
          onBack={() => router.back()}
          backLabel="Records"
          rightElement={
            isAdmin ? (
              <Pressable onPress={handleEdit} hitSlop={12} style={styles.headerIconBtn}>
                <Ionicons name="create-outline" size={24} color={colors.accent.primary} />
              </Pressable>
            ) : null
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroUld}>{inspection.uldId}</Text>
            <Text style={styles.heroAwb}>AWB {inspection.awbNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.heroMeta}>
              Registered {formatInspectionDate(inspection.registeredAt)}
              {inspection.updatedAt
                ? ` · Updated ${formatInspectionDate(inspection.updatedAt)}`
                : ''}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.pdfBar,
              pressed && !isPdfLoading && styles.pdfBarPressed,
              isPdfLoading && styles.pdfBarDisabled,
            ]}
            onPress={handleExportPdf}
            disabled={isPdfLoading}>
            {isPdfLoading ? (
              <ActivityIndicator color={colors.accent.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={22} color={colors.accent.primary} />
            )}
            <Text style={styles.pdfBarText}>Export Inspection PDF</Text>
          </Pressable>

          <View style={styles.card}>
            <DetailRow
              label="Conservation"
              value={getConservationLabel(inspection.conservationType)}
              styles={styles}
            />
            <DetailRow label="Food type" value={inspection.foodType} styles={styles} />
            <DetailRow label="Weight" value={`${inspection.weightKg} kg`} styles={styles} />
            <DetailRow label="Box count" value={String(inspection.boxCount)} styles={styles} />
            {isAdmin ? (
              <DetailRow label="Operator" value={inspection.createdBy} styles={styles} />
            ) : null}
          </View>

          {inspection.hasIssues ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Issue description</Text>
              <Text style={styles.issueText}>
                {inspection.issueDescription?.trim() || 'No description provided.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Photo evidence ({inspection.photoEvidence.length})
            </Text>
            {inspection.photoEvidence.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}>
                {inspection.photoEvidence.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                    <Text style={styles.photoIndex}>
                      {index + 1} / {inspection.photoEvidence.length}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noMedia}>No photos attached.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Video evidence ({inspection.videoEvidence.length})
            </Text>
            {inspection.videoEvidence.length > 0 ? (
              <CargoVideoEvidenceSection videoUrls={inspection.videoEvidence} />
            ) : (
              <Text style={styles.noMedia}>No videos attached.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { DateRangeFilters } from '@/components/DateRangeFilters';
import { UserManagementSection } from '@/components/UserManagementSection';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useVehicleCatalog } from '@/context/VehicleCatalogContext';
import { useVehicles } from '@/context/VehiclesContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { shareVehiclesAsCsv, shareVehiclesAsExcel } from '@/utils/exportVehicles';
import {
  filterVehiclesByDateRange,
  getDateRangeForPreset,
  startOfMonth,
  type DateFilterPreset,
} from '@/utils/filterVehicles';

function createAdminStyles(colors: AppColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 16,
    },
    hero: {
      gap: 10,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(226, 31, 40, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: colors.text.primary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    statsCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    statsIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(226, 31, 40, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsValue: {
      fontFamily: fonts.heading,
      fontSize: 36,
      color: colors.accent.primary,
    },
    statsLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
    },
    sectionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.primary,
      marginTop: 4,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.accent.primary,
      borderRadius: 14,
      padding: 16,
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    actionBtnPressed: {
      opacity: 0.88,
    },
    actionText: {
      flex: 1,
      gap: 2,
    },
    actionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onAccent,
    },
    actionTitleDark: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onSurface,
    },
    actionHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
    },
    actionHintDark: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
    },
  });
}

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAdminStyles);
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const { catalog } = useVehicleCatalog();
  const { vehicles, isLoading: vehiclesLoading } = useVehicles();

  const [isExporting, setIsExporting] = useState<'csv' | 'excel' | null>(null);
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('week');
  const [customFrom, setCustomFrom] = useState(() => startOfMonth());
  const [customTo, setCustomTo] = useState(() => new Date());

  if (!authLoading && !isAdmin) {
    return <Redirect href="/(tabs)/" />;
  }

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const exportVehicles = useMemo(
    () => filterVehiclesByDateRange(vehicles, dateRange.from, dateRange.to),
    [vehicles, dateRange],
  );

  const handleExport = async (format: 'csv' | 'excel') => {
    if (exportVehicles.length === 0) {
      Alert.alert('No records', 'No records in the selected date range.');
      return;
    }

    setIsExporting(format);
    try {
      if (format === 'csv') {
        await shareVehiclesAsCsv(exportVehicles, catalog.types);
      } else {
        await shareVehiclesAsExcel(exportVehicles, catalog.types);
      }
    } catch {
      Alert.alert('Export failed', 'Could not create or share the file. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  if (authLoading || vehiclesLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={28} color={colors.accent.primary} />
          </View>
          <Text style={styles.title}>Admin panel</Text>
          <Text style={styles.subtitle}>
            Export inspection records from {brand.name}. Filter by date before downloading.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsIconWrap}>
            <Ionicons name="server-outline" size={28} color={colors.accent.primary} />
          </View>
          <Text style={styles.statsValue}>{exportVehicles.length}</Text>
          <Text style={styles.statsLabel}>
            Records in range ({vehicles.length} total)
          </Text>
        </View>

        {/* Date filter — same component as Search screen */}
        <DateRangeFilters
          preset={datePreset}
          onPresetChange={setDatePreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        {/* Export buttons */}
        <Text style={styles.sectionTitle}>Download reports</Text>

        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          disabled={isExporting !== null}
          onPress={() => handleExport('csv')}>
          <Ionicons name="document-text-outline" size={22} color={colors.text.onAccent} />
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Export CSV</Text>
            <Text style={styles.actionHint}>
              {exportVehicles.length} record(s) in range
            </Text>
          </View>
          {isExporting === 'csv' ? (
            <ActivityIndicator color={colors.text.onAccent} />
          ) : (
            <Ionicons name="download-outline" size={22} color={colors.text.onAccent} />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionBtnSecondary, pressed && styles.actionBtnPressed]}
          disabled={isExporting !== null}
          onPress={() => handleExport('excel')}>
          <Ionicons name="grid-outline" size={22} color={colors.accent.primary} />
          <View style={styles.actionText}>
            <Text style={styles.actionTitleDark}>Export Excel</Text>
            <Text style={styles.actionHintDark}>Opens in Excel / Google Sheets</Text>
          </View>
          {isExporting === 'excel' ? (
            <ActivityIndicator color={colors.accent.primary} />
          ) : (
            <Ionicons name="download-outline" size={22} color={colors.accent.primary} />
          )}
        </Pressable>

        {/* User management */}
        {user ? <UserManagementSection currentUserUid={user.uid} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

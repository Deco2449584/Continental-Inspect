import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';

type ColorPickerCarouselProps = {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
};

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    group: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    scrollContent: {
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      maxWidth: 160,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: isDark ? colors.surface.muted : colors.surface.default,
    },
    chipSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: isDark ? 'rgba(226, 31, 40, 0.2)' : '#FDE8EA',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.onSurfaceMuted,
    },
    chipTextSelected: {
      color: colors.accent.primary,
      fontWeight: '700',
    },
  });
}

export function ColorPickerCarousel({
  label,
  options,
  value,
  onChange,
}: ColorPickerCarouselProps) {
  const { isDark } = useTheme();
  const styles = useThemedStyles((colors) => createStyles(colors, isDark));

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(option)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={2}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

const logoLight = require('../../assets/brand/logo-light.webp');

type FineShineLogoProps = {
  width?: number;
  style?: ViewStyle;
  /** onDark = white logo on black/dark backgrounds; onLight = black logo on light backgrounds */
  variant?: 'onDark' | 'onLight';
};

export function FineShineLogo({ width = 200, style, variant }: FineShineLogoProps) {
  const { isDark } = useTheme();
  const resolved = variant ?? (isDark ? 'onDark' : 'onLight');
  const height = width * (303 / 400);

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={logoLight}
        style={{
          width,
          height,
          tintColor: resolved === 'onLight' ? '#000000' : undefined,
        }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});

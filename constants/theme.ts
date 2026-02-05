// theme.ts
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    border: '#E5E7EB',
    tint: '#2E7D32',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#2E7D32',
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    surface: '#121212',
    surfaceMuted: '#1C1C1E',
    border: '#2A2A2A',
    tint: '#34C9C9',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#34C9C9',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

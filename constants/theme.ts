// theme.ts
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F9FAFB', // app canvas
    surface: '#2e2d2d14', // cards
    surfaceMuted: '#d0cdcd', // pills, inputs, chips #e7e1e1
    border: '#E5E7EB', // outlines
    tint: '#2E7D32', // actions
    icon: '#687076', // secondary text, icons
    tabIconDefault: '#687076', // inactive tab icons
    tabIconSelected: '#2E7D32', // active tab icons
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000', // app canvas
    surface: '#2e2d2d', // cards
    surfaceMuted: '#1C1C1E', // pills, inputs, chips
    border: '#2A2A2A', // outlines
    tint: '#34C9C9', // actions
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

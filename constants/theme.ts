// constants/theme.ts
import { Platform } from 'react-native';

export const ACCENT_PRESETS = {
  forest: { light: '#2E7D32', dark: '#34C9C9', label: 'Forest (Default)' },
  ocean:  { light: '#1565C0', dark: '#64B5F6', label: 'Ocean'  },
  ember:  { light: '#BF360C', dark: '#FF8A65', label: 'Ember'  },
  violet: { light: '#6A1B9A', dark: '#CE93D8', label: 'Violet' },
  rose:   { light: '#AD1457', dark: '#F48FB1', label: 'Rose'   },
  moss:   { light: '#558B2F', dark: '#AED581', label: 'Moss'   },
  teal:   { light: '#00695C', dark: '#4DB6AC', label: 'Teal'   },
  gold:   { light: '#F57F17', dark: '#FFD54F', label: 'Gold'   },
  indigo: { light: '#283593', dark: '#7986CB', label: 'Indigo' },
  slate:  { light: '#37474F', dark: '#90A4AE', label: 'Slate'  },
} as const;

export type AccentKey = keyof typeof ACCENT_PRESETS;

export const DEFAULT_ACCENT: AccentKey = 'forest';

export function getTint(accent: AccentKey, scheme: 'light' | 'dark'): string {
  return ACCENT_PRESETS[accent][scheme];
}

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F9FAFB',
    surface: '#2e2d2d14',
    surfaceMuted: '#d0cdcd',
    border: '#E5E7EB',
    tint: ACCENT_PRESETS.forest.light,   // default; overridden by useAppTheme
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: ACCENT_PRESETS.forest.light,
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    surface: '#2e2d2d',
    surfaceMuted: '#1C1C1E',
    border: '#2A2A2A',
    tint: ACCENT_PRESETS.forest.dark,    // default; overridden by useAppTheme
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: ACCENT_PRESETS.forest.dark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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

// Returns the best text colour (#fff or #111) to place ON a solid tint background.
// Moss (#558B2F) and Gold (#F57F17) fail WCAG AA with white text in light mode.
const DARK_TEXT_ON_LIGHT_TINT = new Set<AccentKey>(['moss', 'gold']);

export function getOnTintColor(accent: AccentKey, scheme: 'light' | 'dark'): string {
  if (scheme === 'light' && DARK_TEXT_ON_LIGHT_TINT.has(accent)) return '#111111';
  return '#ffffff';
}
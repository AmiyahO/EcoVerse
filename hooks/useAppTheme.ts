// hooks/useAppTheme.ts
import { Colors, getTint, getOnTintColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/src/store/themeStore';

export function useAppTheme() {
  const systemScheme = useColorScheme() ?? 'light';
  const mode      = useThemeStore((s) => s.mode);
  const accentKey = useThemeStore((s) => s.accentKey);

  const resolvedScheme = mode === 'system' ? systemScheme : mode;
  const isDark = resolvedScheme === 'dark';

  const tint    = getTint(accentKey, resolvedScheme);
  const onTint  = getOnTintColor(accentKey, resolvedScheme);

  return {
    scheme: resolvedScheme,
    colors: {
      ...Colors[resolvedScheme],
      tint,
      tabIconSelected: tint,
    },
    onTint,   // text/icon colour to use ON solid tint backgrounds
    isDark,
  };
}

// hooks/useAppTheme.ts
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/src/store/themeStore';

export function useAppTheme() {
  const systemScheme = useColorScheme() ?? 'light';
  const mode = useThemeStore((s) => s.mode);

  const resolvedScheme =
    mode === 'system' ? systemScheme : mode;

  return {
    scheme: resolvedScheme,
    colors: Colors[resolvedScheme],
  };
}

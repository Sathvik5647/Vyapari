/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#161d1f',
    background: '#f4fafd',
    tint: '#9b4500',
    icon: '#564338',
    tabIconDefault: '#564338',
    tabIconSelected: '#9b4500',
    primary: '#9b4500',
    onPrimary: '#ffffff',
    primaryContainer: '#ff8c42',
    onPrimaryContainer: '#6a2d00',
    secondary: '#14696d',
    onSecondary: '#ffffff',
    secondaryContainer: '#a3ecf0',
    onSecondaryContainer: '#1b6d71',
    surface: '#f4fafd',
    surfaceDim: '#d4dbdd',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#eef5f7',
    surfaceContainer: '#e8eff1',
    surfaceContainerHigh: '#e2e9ec',
    surfaceContainerHighest: '#dde4e6',
    onSurface: '#161d1f',
    onSurfaceVariant: '#564338',
    outline: '#897266',
    outlineVariant: '#ddc1b3',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#ffb68d',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#ffb68d',
    primary: '#ffb68d',
    onPrimary: '#542200',
    primaryContainer: '#773300',
    onPrimaryContainer: '#ffdbc9',
    secondary: '#8ad3d7',
    onSecondary: '#00373a',
    secondaryContainer: '#004f53',
    onSecondaryContainer: '#a6eff3',
    surface: '#0e1416',
    surfaceDim: '#0e1416',
    surfaceContainerLowest: '#090f11',
    surfaceContainerLow: '#161d1f',
    surfaceContainer: '#1a2123',
    surfaceContainerHigh: '#252b2d',
    surfaceContainerHighest: '#2f3638',
    onSurface: '#dde4e6',
    onSurfaceVariant: '#ddc1b3',
    outline: '#a48b7f',
    outlineVariant: '#564338',
    error: '#ffb4ab',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
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

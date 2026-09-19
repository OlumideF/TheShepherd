/**
 * Design tokens for Jesus House Auburn.
 * Palette drawn from the official logo: navy, seal green, seal red.
 */

export const colors = {
  canvas: '#F3F5F8',
  canvasElevated: '#FFFFFF',
  ink: '#0A2540',
  inkMuted: '#4A5C6E',
  inkSubtle: '#7A8B9A',
  line: '#D3DBE3',
  /** Primary actions — logo navy */
  brand: '#0A2540',
  brandPressed: '#06182B',
  /** Accent — RCCG seal green */
  accent: '#1F7A3A',
  accentPressed: '#165C2C',
  accentSoft: '#E6F3EA',
  /** Seal red — alerts / emphasis only */
  danger: '#C41E3A',
  dangerSoft: '#FCE8EC',
  success: '#1F7A3A',
  overlay: 'rgba(10, 37, 64, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const typography = {
  brand: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
  },
} as const;

export const touchTarget = 44;

export type ThemeColors = typeof colors;

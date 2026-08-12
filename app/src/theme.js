export const palette = {
  bg: '#FFFFFF',
  bgSoft: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFC',
  cardBorder: 'rgba(0,0,0,0.06)',
  hairline: 'rgba(0,0,0,0.09)',
  ink: '#111111',
  body: '#3A3A3E',
  mutedStrong: '#6C6C70',
  muted: '#98989E',
  gold: '#1C1C1E',
  goldDark: '#6C6C70',
  goldSoft: '#E5E5EA',
  goldBg: '#FFFFFF',
  error: '#FF3B30',
  success: '#34C759',
  info: '#0A84FF',
  inputBg: '#EFEFF4',
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  circle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 0,
  },
};

export const glass = {
  fill: 'rgba(255,255,255,0.78)',
  fillBright: 'rgba(255,255,255,0.9)',
  rim: 'rgba(255,255,255,0.98)',
  sheen: 'rgba(255,255,255,0.6)',
  activeFill: 'rgba(10,132,255,0.12)',
  border: 'rgba(255,255,255,0.98)',
  edge: 'rgba(0,0,0,0.04)',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const typography = {
  largeTitle: { fontFamily: fonts.bold, fontSize: 30, color: palette.ink, letterSpacing: -0.3 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: palette.ink, letterSpacing: -0.2 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: palette.body, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: palette.mutedStrong },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: palette.muted, lineHeight: 17 },
  small: { fontFamily: fonts.semibold, fontSize: 11, color: palette.muted },
};

export const spacing = (m) => [0, 4, 8, 12, 16, 20, 24, 32][m] ?? m;

export default { palette, fonts, radii, shadows, glass, typography, spacing };

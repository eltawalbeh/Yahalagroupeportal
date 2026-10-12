// Ya Hala Group Brand Colors
// Official brand color palette for email templates and communications

export const BRAND_COLORS = {
  // Primary Colors
  primary: '#60AA24',        // Primary Green (Ya Hala Green)
  darkTeal: '#01657C',       // Dark Teal
  secondaryTeal: '#01667D',  // Secondary Teal
  accentTeal: '#027594',     // Accent Teal
  
  // Neutral Colors
  lightGray: '#EFEFEF',      // Light Gray Background
  mediumGray: '#898989',     // Medium Gray Text
  darkGray: '#373737',       // Dark Gray Text
  
  // Status Colors
  success: '#10B981',        // Success Green
  warning: '#FFA500',        // Warning Orange
  error: '#DC2626',          // Error Red
  info: '#3B82F6',           // Info Blue
  
  // Background Colors
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  lightBackground: '#F8F9FA',
  successBg: '#E8F5E9',
  warningBg: '#FFF3CD',
  errorBg: '#FEF2F2',
  
  // Text Colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#898989',
  textWarning: '#856404',
  
  // Portal Configuration
  portalUrl: 'https://portal.yahala.co'
} as const;

export type BrandColor = typeof BRAND_COLORS[keyof typeof BRAND_COLORS];

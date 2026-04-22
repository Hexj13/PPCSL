export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  dark: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  bg: {
    base: string;
    secondary: string;
    darker: string;
    partnerLogo: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  divider: string;
  accent: string;
  accentSecondary: string;
  newBadge: string;
  semantic: {
    success: string;
    error: string;
    danger: string;
    warning: string;
    info: string;
    rose: string;
  };
  pwa?: {
    backgroundColor: string;
    themeColor: string;
  };
}

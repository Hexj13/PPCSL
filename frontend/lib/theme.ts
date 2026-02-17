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
  };
  pwa?: {
    backgroundColor: string;
    themeColor: string;
  };
}

let theme: ThemeColors | null = null;

export async function loadTheme(country: string): Promise<ThemeColors> {
  if (theme) {
    return theme;
  }

  try {
    // Dynamic import may not exist in core repository
    // @ts-ignore - File may not exist in core, will be provided by platform repository
    const module = await import(`./theme/colors`).catch(() => null);
    if (module?.default) {
      theme = module.default;
      return theme!;
    }
    throw new Error('Module not found');
  } catch {
    console.warn(
      `Theme file not found for ${country}, using default theme. This is expected in core repository.`,
    );
    return defaultTheme;
  }
}

export function getTheme(): ThemeColors {
  if (!theme) {
    throw new Error('Theme not loaded. Call loadTheme first.');
  }
  return theme;
}

const defaultTheme: ThemeColors = {
  primary: {
    50: '#f0f9f6',
    100: '#d4ede4',
    200: '#a9dbc9',
    300: '#75C9A5',
    400: '#5fa88a',
    500: '#40916B',
    600: '#40916B',
    700: '#2E6F51',
    800: '#245a45',
    900: '#1a4534',
  },
  dark: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#0d1117',
  },
  bg: {
    base: '#F5F5F5',
    secondary: '#F4F4F4',
    darker: '#E8E8E8',
  },
  text: {
    primary: '#1B1B1B',
    secondary: '#4A4A4A',
  },
  divider: '#DADADA',
  accent: '#F2AE3E',
  accentSecondary: '#FF5A5F',
  newBadge: '#6AA4C6',
  semantic: {
    success: '#28A745',
    error: '#DC3545',
    danger: '#FFC107',
    warning: '#FFC107',
    info: '#0D6EFD',
  },
  pwa: {
    backgroundColor: '#F5F5F5',
    themeColor: '#40916B',
  },
};

export function loadThemeSync(country: string): ThemeColors {
  try {
    const themeModule = require(`./theme/colors`);
    return themeModule.default;
  } catch {
    console.warn(
      `Theme file not found for ${country}, using default theme. This is expected in core repository.`,
    );
    return defaultTheme;
  }
}

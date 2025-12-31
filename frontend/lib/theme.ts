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
    dark: string;
    darker: string;
    light: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
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
      `Theme file not found for ${country}, using default theme. This is expected in core repository.`
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
    50: '#f0fdf7',
    100: '#d4fae8',
    200: '#aaf5d1',
    300: '#7ef0ba',
    400: '#6eeb9c',
    500: '#6eeb9c',
    600: '#3bc973',
    700: '#2da55f',
    800: '#1f814b',
    900: '#115d37',
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
    dark: '#1a2e2a',
    darker: '#152520',
    light: '#233d37',
  },
  semantic: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
};

export function loadThemeSync(country: string): ThemeColors {
  try {
    const themeModule = require(`./theme/colors`);
    return themeModule.default;
  } catch {
    console.warn(
      `Theme file not found for ${country}, using default theme. This is expected in core repository.`
    );
    return defaultTheme;
  }
}

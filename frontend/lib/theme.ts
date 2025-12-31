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
    const module = await import(`./theme/colors`);
    theme = module.default;
    return theme!;
  } catch (error) {
    console.error(`Failed to load theme for ${country}:`, error);
    throw new Error(`Theme for ${country} not found`);
  }
}

export function getTheme(): ThemeColors {
  if (!theme) {
    throw new Error('Theme not loaded. Call loadTheme first.');
  }
  return theme;
}

export function loadThemeSync(country: string): ThemeColors {
  try {
    const themeModule = require(`./theme/colors`);
    return themeModule.default;
  } catch (error) {
    console.error(`Failed to load theme for ${country}:`, error);
    throw new Error(`Theme for ${country} not found`);
  }
}

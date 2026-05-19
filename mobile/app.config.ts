import type { ExpoConfig } from 'expo/config';

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '';

export default (): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (profile === 'production' ? 'https://kupito.club' : 'http://10.0.2.2:4000');

  return {
    name: 'Kupito',
    slug: 'kupito-club',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'kupito',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#40916B',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'club.kupito.app',
    },
    android: {
      package: 'club.kupito.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#40916B',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'kupito.club',
              pathPrefix: '/listing',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      './plugins/withGradleNode.js',
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 24,
            usesCleartextTraffic: true,
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Kupito to access your camera to photograph listings.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Kupito to access your photos to attach listing images.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#40916B',
        },
      ],
      ...(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
        ? ([
            [
              'sentry-expo',
              {
                organization: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
              },
            ],
          ] as NonNullable<ExpoConfig['plugins']>)
        : []),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: easProjectId || undefined,
      },
      apiUrl,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    },
    ...(easProjectId
      ? {
          updates: {
            url: `https://u.expo.dev/${easProjectId}`,
          },
          runtimeVersion: {
            policy: 'appVersion' as const,
          },
        }
      : {}),
  };
};

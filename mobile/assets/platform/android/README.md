# Android store assets (kupito.club platform)

Place files here to copy into `core/mobile/assets/platform/android/` via `npm run prepare:build`.

| File | Use |
|------|-----|
| `icon.png` | 1024×1024, Play + adaptive base |
| `adaptive-icon-foreground.png` | Foreground for adaptive icon |
| `splash.png` | Splash screen image |
| `feature-graphic.png` | 1024×500 for Play listing |

Until these exist, the Expo default assets under `core/mobile/assets/images/` remain in use.

## Legal / Data Safety

- Privacy policy URL: same as web (`config/legal.ts`).
- Data Safety in Play Console: account data (email, phone), listing photos, push token when enabled.

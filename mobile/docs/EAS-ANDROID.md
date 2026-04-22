# EAS Android (Internal Testing → production)

## One-time

1. `npm i -g eas-cli`
2. `cd core/mobile && eas login`
3. `eas init` — записать `projectId` в `EXPO_PUBLIC_EAS_PROJECT_ID` (и в `app.config.ts` через env при CI).
4. Google Play: создать приложение, включить Play App Signing, выгрузить первый AAB вручную при необходимости.
5. Service Account JSON для submit — положить рядом с `eas.json` как `google-service-account.json` (не коммитить).

## Сборки

```bash
cd core/mobile
npm ci
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

Preview/production должны получать `EXPO_PUBLIC_API_URL` через secrets EAS (`eas secret:create`).

## Internal Testing

После `production` AAB: Play Console → Testing → Internal testing → создать релиз из артефакта EAS или через:

```bash
npx eas build --profile production --platform android --auto-submit
```

## OTA

Только если не менялись нативные модули / SDK:

```bash
eas update --branch production --message "fix: …"
```

## assetlinks

Замените отпечаток SHA-256 в `core/frontend/public/.well-known/assetlinks.json` на значение из Play Console (App signing).

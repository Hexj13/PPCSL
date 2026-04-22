# Локальное тестирование (Android)

## 1. API (NestJS)

В одном терминале из корня **платформы** `kupito.club`:

```bash
npm run dev
```

Это поднимает frontend (3000) и backend (4000) через `core/`. Убедитесь, что порт **4000** свободен.

Если нужен только бэкенд:

```bash
cd core && npm run dev:backend
```

## 2. Синхронизация и зависимости mobile

```bash
cd /path/to/kupito.club
npm run prepare:build
cd core/mobile
npm ci
```

Если файла `.env` ещё нет:

```bash
cp env.example .env
```

## 3. URL API

| Где тестируете | `EXPO_PUBLIC_API_URL` в `.env` |
|----------------|--------------------------------|
| Эмулятор Android | `http://10.0.2.2:4000` |
| Телефон по Wi‑Fi | `http://<LAN-IP-Mac>:4000` (например `http://192.168.1.42:4000`) |

LAN-IP на macOS: `ipconfig getifaddr en0` (или `en1`).

После смены `.env` перезапустите Metro (`r` в терминале Expo или остановить и снова `npx expo start`).

## 4. Запуск приложения

Из корня платформы:

```bash
npm run dev:mobile
```

Или:

```bash
cd core/mobile && npx expo start
```

Дальше:

- **Эмулятор**: в окне Expo нажмите `a` или откройте проект в Android Studio AVD.
- **Физическое устройство**: установите **Expo Go** из Play Store и отсканируйте QR (режим tunnel: `npx expo start --tunnel`, если LAN недоступен).

Для нативных модулей (secure-store, camera, notifications) вместо Expo Go нужен **development build**:

```bash
cd core/mobile
npx eas build --profile development --platform android
```

Установите выданный `.apk`, затем:

```bash
npx expo start --dev-client
```

## 5. Минимальный сценарий проверки

1. Каталог объявлений загружается.
2. Открытие карточки объявления.
3. Регистрация / вход (пароль ≥ 8 символов, требования как на вебе).
4. Избранное после входа.
5. Создание объявления (фото из галереи или камеры) — нужен авторизованный пользователь.

## 6. Частые проблемы

- **Network Error** на телефоне: неверный IP в `.env` или firewall блокирует порт 4000.
- **401 после входа**: проверьте, что backend тот же, что и в `.env`.
- **CORS**: для нативного приложения CORS браузера не применяется; если ошибки только в web-версии Expo — игнорируйте для целей Android APK.

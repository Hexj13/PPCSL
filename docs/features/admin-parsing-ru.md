---
title: Admin parsing tab (RU)
owner: platform
tags:
  - type/feature
  - domain/parsing
  - scope/core
  - status/active
---

# Вкладка `Парсинг` в админке (as-is)

## Назначение

Документ фиксирует текущее поведение вкладки `Парсинг` в админке Kupito без продуктовых пожеланий и roadmap-частей.

Вкладка используется для:

- ручного запуска `PLP` и `PDP`
- просмотра истории запусков
- просмотра live-логов и отчётов
- управления расписаниями
- проверки доступности источника для расписаний

## Текущее состояние

- в UI доступны parser entries, которые backend возвращает через `GET /api/admin/parsing/catalog`
- сейчас доступны `cipauto`, `999md` и `autooutlet`
- `targetEnv` выбирается только на backend по runtime-конфигурации (`local` или `prod`)
- ручной `PDP` запуск работает только по данным из PLP-файла (`plpFileKey`)
- scheduler включён по умолчанию и отключается только через env

## Где реализовано

- frontend: `core/frontend/app/admin/components/ParsingTab.tsx`
- frontend таблицы: `core/frontend/app/admin/components/ParsingTabTables.tsx`
- frontend API client: `core/frontend/lib/api/admin-parsing.ts`
- backend controller: `core/backend/src/parsing/presentation/admin-parsing.controller.ts`
- backend orchestration: `core/backend/src/parsing/application/parsing-orchestrator.service.ts`
- backend scheduler/service: `core/backend/src/parsing/application/parsing-schedule.service.ts`
- backend cron jobs: `core/backend/src/parsing/application/parsing-schedule-cron.service.ts`
- parser catalog: `core/backend/src/parsing/application/parser-catalog.ts`
- source catalog config: `config/parsers.ts`

## Подвкладки UI

Вкладка содержит три подвкладки:

- `PLP`
- `PDP`
- `Планировщик`

Все действия выполняются через backend API, прямых вызовов CLI из frontend нет.

## Parser catalog (as-is)

Каталог формируется из `config/parsers.ts` и отдаётся через backend.

Текущие записи:

- `cipauto`
  - `scanInputMode: pages`
  - `plpMode: mono`
  - `manualRunEnabled: true`
  - `schedulerEnabled: true`
  - `adminAvailability: enabled`
  - `releaseStage: released`
- `999md`
  - `scanInputMode: profile_login`
  - `plpMode: multi`
  - `manualRunEnabled: true`
  - `schedulerEnabled: true`
  - `adminAvailability: enabled`
  - `releaseStage: released`
- `autooutlet`
  - `scanInputMode: pages`
  - `plpMode: mono`
  - `manualRunEnabled: true`
  - `schedulerEnabled: true`
  - `adminAvailability: enabled`
  - `releaseStage: prepared`

## PLP

### Что показывает

- список PLP-файлов (`/api/admin/parsing/plp-files`): колонки parser, имя файла, последнее обновление, число объявлений, ошибки, «missing» (кандидаты на пропуск/недоступность по данным файла), действия. Список загружает снимки параллельно и предпочитает счётчики из `meta` файла (в т.ч. `errorItemsCount`, если есть).
- историю PLP-запусков (`/api/admin/parsing/plp-runs`)

Обе таблицы paginated.

### Действия в PLP

Для PLP-файлов:

- открыть файл
- скачать файл
- удалить файл

Для PLP-run:

- открыть логи
- открыть текущий PLP-файл (только для последнего PLP-run по parser в текущей таблице)
- отменить запуск (если run активен)

### Модалка ручного PLP запуска

Базовые поля:

- `Parser`
- `Окружение` (read-only контекст)
- параметры запуска

Параметры зависят от `scanInputMode` parser:

- `pages` mode:
  - `scanMode`: `first_n` / `all` (для `cipauto`)
  - `scanMode`: `first_n` / `range` / `all` (для parser без ограничений `cipauto`)
  - `pagesFirst`, `pageFrom`, `pageTo`
  - `delayMs`, `resume`, `dryRun`, `removeClosed` — при включении объявления, которые источник помечает закрытыми/недоступными (в т.ч. 404/410/шаблон «закрыто»), закрываются и на платформе; при выключении фиксация в регистре импорта, на платформе объявление может оставаться активным
- `profile_login` mode:
  - `login`, `pageSize`, `maxItems`
  - `delayMs`, `resume`, `dryRun` (чекбокс `removeClosed` в форме только в режиме `pages`)

Кнопка запуска блокируется, если обязательные поля невалидны.

## PDP

### Что показывает

- историю PDP-запусков (`/api/admin/parsing/pdp-runs`)

### Действия в PDP

Для PDP-run:

- открыть логи
- открыть отчёт
- отменить запуск (если run активен)

### Модалка ручного PDP запуска

Базовые поля:

- `Parser`
- `Окружение` (read-only контекст)
- `assignedUserId` (обязателен)
- `plpFileKey` (обязателен)

Поля запуска:

- `listingStatus`
- `limit`
- `resume`
- `dryRun`
- `onlyFailed`
- `updateExisting`
- `registrationType`
- `defaultHp`
- `city` (обязательно)
- `delayMs`
- `removeClosed` — тот же смысл, что в PLP (закрытие на платформе при недоступности на источнике vs только регистр)
- `forceClose` — обойти защиту `maxClose` / `MAX_CLOSE` (например лимит ~50 кандидатов) и закрыть все нужные объявления; в UI доступен только при включённом `removeClosed`; в CLI это `--force-close`
- `checkUserDuplicatesBeforeCreate` — перед `createListing` проверять дубликаты по правилам парсера (см. `parsing-framework.md` и парсерные доки в `docs/parsing/`)
- `autoCreateBrands`, `autoCreateModels` — при отсутствии марки/модели в каталоге создавать их через admin API (`POST /api/admin/brands`, `POST /api/admin/vehicle-models`) и продолжать импорт в этом же запуске; учётка импорта должна быть Admin

`assignedUserId` проходит preflight-валидацию через admin API.

## Планировщик

### Что показывает

- список расписаний (`/api/admin/parsing/schedules`)
- колонки: parser, runType, assigned user, frequency, status, next run, last run, availability (индикатор + краткий summary; подсказка в UI описывает HTTP GET и различие PLP vs PDP), actions. Окружение (`targetEnv`) задаётся на backend и в этой таблице не показывается.

Сортировка на backend:

- `next_run_at ASC NULLS LAST`
- `updated_at DESC`

### Действия над расписанием

- `Run now`
- `Edit`
- `Activate` / `Deactivate`
- `Delete` (soft delete)

### Модалка расписания

Поддерживает оба `runType`:

- `plp`
- `pdp`

Состав `configSnapshot` зависит от `runType`.

Для `plp`:

- `scanMode`, `pages/pageFrom/pageTo` или `login/pageSize/maxItems`
- `delayMs`
- `removeClosed` — в UI чекбокс только при `scanInputMode: pages` у parser в каталоге

Для `pdp`:

- `listingStatus`
- `plpFileKey`
- `limit`
- `onlyFailed`
- `updateExisting`
- `registrationType`
- `defaultHp`
- `city`
- `delayMs`
- `removeClosed`
- `forceClose` — тот же смысл, что в ручном PDP (`--force-close`)
- `checkUserDuplicatesBeforeCreate`
- `autoCreateBrands`, `autoCreateModels` (для совместимости со старыми снапшотами также читается legacy `autoCreateBrandsModels`)
- `dataSource: plp_registry`

Частота:

- `every_n_hours` (интервал в часах)
- `every_n_days` (интервал 1–30 суток и время суток запуска)
- `daily`
- `weekly`
- `custom` (cron expression)

Timezone по умолчанию: `Europe/Chisinau`.

При редактировании нельзя менять parser/runType, и `assignedUserId` для PDP показывается read-only.

## Live-логи и отчёты (as-is)

### Логи

- endpoint: `GET /api/admin/parsing/runs/:id/logs?afterSeq=<n>`
- модалка логов работает polling-ом примерно раз в `2500ms`
- polling активен, пока статус run: `queued`, `in_progress`, `cancel_requested`
- после завершения polling прекращается
- UI поддерживает поиск по логу и copy в буфер

### Отчёты

- endpoint: `GET /api/admin/parsing/runs/:id/report`
- отчёт показывается как форматированный JSON в текстовой модалке
- отдельной структурированной вкладочной обёртки (`Summary/Errors/Raw`) сейчас нет

### Current PLP file

- endpoint: `GET /api/admin/parsing/runs/:id/current-plp-file`
- используется для просмотра текущего PLP-файла run

## API (полный список)

- `GET /api/admin/parsing/catalog`
- `GET /api/admin/parsing/parsers/:parserCode/plp-files`
- `GET /api/admin/parsing/plp-files`
- `GET /api/admin/parsing/parsers/:parserCode/plp-files/:fileKey`
- `GET /api/admin/parsing/parsers/:parserCode/plp-files/:fileKey/download`
- `DELETE /api/admin/parsing/parsers/:parserCode/plp-files/:fileKey`
- `GET /api/admin/parsing/plp-runs`
- `GET /api/admin/parsing/pdp-runs`
- `GET /api/admin/parsing/runs/:id`
- `GET /api/admin/parsing/runs/:id/logs`
- `GET /api/admin/parsing/runs/:id/report`
- `GET /api/admin/parsing/runs/:id/current-plp-file`
- `POST /api/admin/parsing/plp-runs`
- `POST /api/admin/parsing/pdp-runs`
- `POST /api/admin/parsing/runs/:id/cancel`
- `GET /api/admin/parsing/schedules`
- `POST /api/admin/parsing/schedules`
- `PATCH /api/admin/parsing/schedules/:id`
- `PATCH /api/admin/parsing/schedules/:id/status`
- `DELETE /api/admin/parsing/schedules/:id`
- `POST /api/admin/parsing/schedules/:id/run-now`

## Backend runtime orchestration

### Run lifecycle

- run создаётся со статусом `queued`
- запуск переводится в `in_progress`
- по завершении статус становится `completed` или `failed`
- при отмене используется `cancel_requested` и затем `cancelled`

### Отмена run

- если run в `queued` и процесс ещё не стартовал, run закрывается сразу в `cancelled`
- если процесс активен:
  - отправляется `SIGTERM`
  - после grace timeout отправляется `SIGKILL`
  - timeout берётся из `ADMIN_PARSING_CANCEL_GRACE_MS`

### Ограничение параллельных run

- действует проверка на активный run по комбинации `parser_code + run_type + target_env`
- второй активный run с той же комбинацией не создаётся
- в БД есть partial unique index на активные статусы

### Reconcile после рестарта

- при старте приложения stale run со статусами `queued/in_progress/cancel_requested` переводятся в `failed`

## Scheduler runtime

### Cron jobs

- every minute:
  - claim due schedules (`limit 15`)
  - create run from schedule
- every 5 minutes:
  - refresh availability batch для активных schedule
  - выбираются schedule с `resource_availability_checked_at` старше 10 минут (`limit 25`)

### Claim strategy

- используется pessimistic lock + `skip_locked`
- `next_run_at` пересчитывается в транзакции до фактического запуска run

### Availability

Backend проверяет доступность сайта-источника одним **HTTP GET** по `availabilityProbe.sourceUrl` (или override из `sourceUrlEnvVar` в `config/parsers.ts`). Для CipAuto при Cloudflare-блоке возможен retry через FlareSolverr (`CIPAUTO_FLARESOLVERR_URL`). PLP и PDP используют одну и ту же проверку сайта. Успех — HTTP «ok» ответа.

Статусы:

- `available`
- `unavailable`
- `partial` (legacy; больше не записывается новой проверкой, может остаться до следующего refresh)
- `unchecked` (тип поддерживается, но обычно приходит `null` пока проверка не была выполнена)

Поля в schedule:

- `resource_availability_status`
- `resource_availability_checked_at`
- `resource_availability_summary`
- `resource_availability_scope`

Проверка availability выполняется в фоне (ответ API не ждёт probe) при:

- создании schedule
- обновлении schedule
- `run now`

а также в batch cron для активных schedule.

## Модель данных (фактическая)

### `parser_runs`

Ключевые поля:

- `id`
- `parser_code`
- `run_type`
- `domain`
- `assigned_user_id`
- `target_env`
- `trigger_mode`
- `schedule_id`
- `status`
- `config_snapshot`
- `started_at`
- `finished_at`
- `cancel_requested_at`
- `created_by_admin_user_id`
- `log_storage_key`
- `report_storage_key`
- `counters`
- `source_status_summary`
- `error_summary`
- `process_pid`
- `created_at`
- `updated_at`

### `parser_schedules`

Ключевые поля:

- `id`
- `parser_code`
- `run_type`
- `domain`
- `assigned_user_id`
- `target_env`
- `cron_expression`
- `frequency_preset`
- `timezone`
- `status`
- `config_snapshot`
- `next_run_at`
- `last_run_at`
- `resource_availability_status`
- `resource_availability_checked_at`
- `resource_availability_summary`
- `resource_availability_scope`
- `created_by_admin_user_id`
- `updated_by_admin_user_id`
- `deleted_at`
- `created_at`
- `updated_at`

### `parser_log_chunks`

Ключевые поля:

- `id`
- `run_id`
- `seq`
- `level`
- `message`
- `raw_line`
- `created_at`

## Audit logging (фактическое покрытие)

Логируются действия:

- создание ручного PLP run
- создание ручного PDP run
- cancel run
- create schedule
- update schedule
- set schedule status
- delete schedule
- run schedule now

Данные пишутся через `AdminAuditService` в audit log сущности админки.

## Привязка к окружению

- backend вычисляет `targetEnv` через `ADMIN_PARSING_TARGET_ENV`
- поддерживаются `local` и `prod`
- API не использует `targetEnv` из payload как источник правды
- все created runs/schedules автоматически получают окружение backend runtime

## Конфигурация env (используется сейчас)

- `ADMIN_PARSING_TARGET_ENV`
- `ADMIN_PARSING_CANCEL_GRACE_MS`
- `ADMIN_PARSING_SCHEDULER_ENABLED`
- `ADMIN_PARSING_KUPITO_API_URL`
- `ADMIN_PARSING_ADMIN_EMAIL`
- `ADMIN_PARSING_ADMIN_PASSWORD`
- `ADMIN_PARSING_IMPORT_SECRET`
- fallback совместимости:
  - `KUPITO_IMPORT_API_URL`
  - `KUPITO_IMPORT_ADMIN_EMAIL`
  - `KUPITO_IMPORT_ADMIN_PASSWORD`
  - `KUPITO_IMPORT_SECRET`
  - `CIPAUTO_*` legacy переменные

Примечание: `resolveParsingMaxConcurrentRuns()` существует в коде, но сейчас не участвует в orchestration логике запуска.

## Известные ограничения текущей реализации

- модалки логов и отчётов текстовые, без структурированной вкладочной презентации
- отдельной специализированной модалки `Ошибки` нет; анализ делается через логи/отчёт
- `run now` выполняется без отдельного confirm modal
- сортировка schedule в UI определяется backend и не имеет клиентской перенастройки

## Связанные документы

- [Parsing Framework (Core)](./parsing-framework.md)
- [CipAuto parser (kupito.club)](../../../docs/parsing/cipauto-import.md)
- [999.md parser (kupito.club)](../../../docs/parsing/999md-import.md)
- [AutoOutlet parser (kupito.club)](../../../docs/parsing/autooutlet-import.md)
- [PPCSL Core Documentation](../README.md)

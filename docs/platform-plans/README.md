# Platform Plans

Детальные планы для создания платформ в конкретных странах.

## 📄 Документы

### 🇦🇱 [PLAN_ALBANIA_PLATFORM.md](./PLAN_ALBANIA_PLATFORM.md)
**Полный план** для создания платформы в Албании (AutoShqip).

Содержит:
- Конфигурация для Албании
- Албанские переводы (структура)
- Графические ресурсы
- Скрипты генерации данных (албанские города)
- DNS, деплой, Twilio
- Google Analytics, Search Console
- Юридические документы
- Environment variables
- Полный чеклист

**Используй этот план как шаблон** для других стран!

---

## 🌍 Будущие платформы

При создании плана для новой страны, используй PLAN_ALBANIA_PLATFORM.md как шаблон:

```
platform-plans/
├── PLAN_ALBANIA_PLATFORM.md    ✅ Готово
├── PLAN_SERBIA_PLATFORM.md     🔜 Будущее
├── PLAN_KOSOVO_PLATFORM.md     🔜 Будущее
└── PLAN_BULGARIA_PLATFORM.md   🔜 Будущее
```

---

## 📋 Шаблон для нового плана

Каждый план должен содержать:

1. **Конфигурация** (`config/site.ts`)
   - Страна, язык, валюта
   - Домен, email поддержки
   - Телефонный код

2. **Переводы** (`locales/{lang}.json`)
   - Структура переводов
   - Юридические документы
   - SMS сообщения

3. **Графические ресурсы** (`assets/`)
   - Логотипы
   - Иконки, favicon
   - Open Graph images
   - Watermark

4. **Скрипты** (`scripts/{country}/`)
   - seed-config.ts (города, описания)
   - Генерация данных

5. **Инфраструктура**
   - DNS (Namecheap)
   - Деплой (Render.com)
   - Twilio (SMS)
   - Google Analytics/Search Console
   - S3/CloudFront

6. **Environment Variables**
   - Backend (.env)
   - Frontend (.env)

7. **Чеклист**
   - Все этапы
   - Статус выполнения

---

## 💡 Tips

- **Используй Albania план** как reference
- **Адаптируй под страну** (города, переводы, законы)
- **Проверяй чеклист** - ничего не упусти
- **Документируй особенности** - каждая страна уникальна

---

[← Назад к общей документации](../)

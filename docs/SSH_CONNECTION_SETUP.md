# Настройка SSH подключения

## Вариант 1: Скачать приватный ключ с сервера

### Шаг 1: Получить приватный ключ с сервера

Если у вас есть доступ к серверу через cPanel Terminal или другой способ:

```bash
# На сервере выполните:
cat ~/.ssh/id_rsa
```

Скопируйте весь вывод (начинается с `-----BEGIN RSA PRIVATE KEY-----` и заканчивается `-----END RSA PRIVATE KEY-----`)

### Шаг 2: Сохранить ключ на локальном Mac

```bash
# Создайте файл на вашем Mac
nano ~/.ssh/kupito_key

# Вставьте скопированный приватный ключ
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Установите правильные права
chmod 600 ~/.ssh/kupito_key
```

### Шаг 3: Подключиться к серверу

```bash
ssh -i ~/.ssh/kupito_key kupitomk@luna.mk-host.mk
```

---

## Вариант 2: Сгенерировать ключ на локальном Mac (рекомендуется)

### Шаг 1: Сгенерировать ключ на Mac

```bash
# Сгенерируйте новый SSH ключ
ssh-keygen -t rsa -b 2048 -f ~/.ssh/kupito_key

# Нажмите Enter для пустого пароля (или задайте пароль)
```

### Шаг 2: Скопировать публичный ключ

```bash
# Покажите публичный ключ
cat ~/.ssh/kupito_key.pub
```

Скопируйте весь вывод (начинается с `ssh-rsa ...`)

### Шаг 3: Добавить ключ в cPanel

1. Войдите в cPanel: https://luna.mk-host.mk/cpanel
2. Найдите "SSH Access" → "Manage SSH Keys"
3. Нажмите "Import Key"
4. Вставьте скопированный публичный ключ
5. Имя ключа: `kupito_key` (или любое)
6. Нажмите "Import"
7. После импорта нажмите "Authorize" рядом с ключом

### Шаг 4: Подключиться к серверу

```bash
ssh -i ~/.ssh/kupito_key kupitomk@luna.mk-host.mk
```

### Шаг 5: Настроить SSH config (опционально, для удобства)

```bash
# Отредактируйте SSH config
nano ~/.ssh/config
```

Добавьте:

```
Host kupito
    HostName luna.mk-host.mk
    User kupitomk
    IdentityFile ~/.ssh/kupito_key
```

Теперь можно подключаться просто:

```bash
ssh kupito
```

---

## Вариант 3: Использовать пароль (если SSH ключи не работают)

Если у вас есть пароль для SSH доступа:

```bash
ssh kupitomk@luna.mk-host.mk
```

Введите пароль когда попросит.

---

## После подключения: Клонировать проект

```bash
# Перейдите в директорию для проекта
cd ~/public_html

# Клонируйте репозиторий (замените на ваш URL)
git clone https://github.com/ваш-username/kupito.git

# Или если используете SSH для GitHub:
git clone git@github.com:ваш-username/kupito.git

# Перейдите в проект
cd kupito
```


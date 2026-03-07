# Security CI/CD Integration

## Обзор изменений

Реализован воспроизводимый security-аудит с полной интеграцией в CI/CD pipeline.

## Что было сделано

### 1. ✅ Воспроизводимый Security Audit в CI

**Файл:** `.github/workflows/ci.yml`

Добавлен новый job `security-audit`:
- Автоматически запускается на каждом PR
- Поднимает тестовый сервер (`npm run preview`)
- Выполняет security audit против локального сервера
- Проверяет security headers, access controls, SQL injection, session security
- Корректно останавливает сервер после проверки

```yaml
security-audit:
  runs-on: ubuntu-latest
  needs: fast-check
  steps:
    - Build application
    - Start test server (localhost:4173)
    - Run security audit
    - Stop test server
```

### 2. ✅ Security Gate для PR

**Файл:** `.github/workflows/ci.yml`

Добавлен job `security-gate`:
- Блокирует merge PR при провале любой проверки
- Проверяет статус: `full-check`, `lint-check`, `security-audit`
- Выводит детальный отчет о провалах
- Интегрируется с GitHub Branch Protection Rules

### 3. ✅ Обязательный SESSION_SECRET для staging/prod

**Файл:** `.github/workflows/deploy.yml`

Добавлена валидация SESSION_SECRET:
- Проверка наличия секрета перед деплоем
- Валидация минимальной длины (≥32 символа)
- Автоматическая установка секрета в Cloudflare Workers
- Блокировка деплоя при отсутствии секрета

```yaml
- name: Validate SESSION_SECRET
  run: |
    if [ -z "${{ secrets.SESSION_SECRET }}" ]; then
      echo "❌ ERROR: SESSION_SECRET not configured"
      exit 1
    fi
```

### 4. ✅ Security Audit в Deploy Pipeline

**Файл:** `.github/workflows/deploy.yml`

Deploy gate теперь включает:
- Все существующие проверки (typecheck, tests, build)
- Security audit против тестового сервера
- Валидация перед деплоем

### 5. 📝 Документация

Созданы руководства:

**`.github/SECURITY_SETUP.md`**
- Настройка GitHub Secrets
- Генерация SESSION_SECRET
- Локальный запуск security audit
- Security checklist для деплоя
- Incident response процедуры

**`.github/BRANCH_PROTECTION.md`**
- Настройка Branch Protection Rules
- Конфигурация required status checks
- Тестирование security gate
- Troubleshooting

**`.github/SECURITY_CI_README.md`** (этот файл)
- Обзор всех изменений
- Быстрый старт

### 6. 🛠 Утилиты

**`scripts/validate-secrets.ts`**
- Валидация SESSION_SECRET (длина, энтропия, weak patterns)
- Проверка Cloudflare credentials
- Валидация окружения
- Доступен через: `npm run security:validate`

## Быстрый старт

### Локальная разработка

```bash
# 1. Запустите dev сервер
npm run dev

# 2. В другом терминале запустите security audit
TEST_URL=http://localhost:5173 npm run security:audit

# 3. Проверьте конфигурацию secrets (опционально)
SESSION_SECRET=your-secret npm run security:validate
```

### Настройка CI/CD

```bash
# 1. Сгенерируйте SESSION_SECRET
openssl rand -base64 48

# 2. Добавьте secrets в GitHub
# Settings → Secrets and variables → Actions
# - SESSION_SECRET (для staging и production environments)
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ACCOUNT_ID

# 3. Настройте Branch Protection
# Settings → Branches → Add rule
# Required status checks:
#   - fast-check
#   - full-check  
#   - lint-check
#   - security-audit
#   - security-gate

# 4. Создайте тестовый PR для проверки
git checkout -b test-security-gate
git commit --allow-empty -m "Test security gate"
git push origin test-security-gate
# Создайте PR и убедитесь что все проверки запускаются
```

### Деплой

```bash
# Деплой через GitHub Actions
# Actions → Deploy → Run workflow
# Выберите environment: staging или production

# Workflow автоматически:
# 1. Валидирует SESSION_SECRET
# 2. Запускает все проверки включая security audit
# 3. Применяет миграции БД
# 4. Деплоит на Cloudflare Workers
# 5. Устанавливает SESSION_SECRET в Workers
```

## Архитектура CI Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                     Pull Request                         │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    fast-check                            │
│  • Typecheck                                             │
│  • CODEX Rules                                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
┌──────────────┐          ┌──────────────┐
│  full-check  │          │ lint-check   │
│  • Tests     │          │ • Lint       │
│  • Build     │          └──────┬───────┘
└──────┬───────┘                 │
       │                         │
       │    ┌────────────────────┘
       │    │
       │    │    ┌──────────────────────────┐
       │    │    │   security-audit         │
       │    │    │  • Start test server     │
       │    │    │  • Run security checks   │
       │    │    │  • Stop server           │
       │    │    └──────┬───────────────────┘
       │    │           │
       └────┴───────────┴─────────┐
                                  ↓
                    ┌──────────────────────┐
                    │   security-gate      │
                    │  • Check all passed  │
                    │  • Block if failed   │
                    └──────┬───────────────┘
                           ↓
                    ✅ Merge allowed
```

## Security Checks

Security audit проверяет:

1. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options / CSP frame-ancestors
   - Strict-Transport-Security (HTTPS)
   - Content-Security-Policy

2. **Access Controls**
   - Unauthenticated access to sensitive routes
   - Admin route protection
   - Cross-tenant access prevention

3. **Injection Protection**
   - SQL injection vectors
   - Parameterized queries
   - Input validation

4. **Session Security**
   - HttpOnly flag
   - Secure flag (HTTPS)
   - SameSite attribute

5. **CORS Policy**
   - Restrictive CORS configuration
   - Origin validation

## Мониторинг

### GitHub Actions

Проверяйте статус в:
- Pull Requests → Checks tab
- Actions → CI workflow runs
- Branch protection status

### Cloudflare Dashboard

После деплоя мониторьте:
- Worker invocations
- Error rates
- Security events
- Traffic patterns

## Troubleshooting

### Security audit падает с timeout

```yaml
# В .github/workflows/ci.yml увеличьте timeout:
timeout 120 bash -c 'until curl -f http://localhost:4173...'
```

### Тестовый сервер не запускается

```bash
# Проверьте локально:
npm run build
npm run preview

# Проверьте порт 4173 свободен
lsof -i :4173
```

### SESSION_SECRET не установлен

```bash
# Проверьте secrets в GitHub:
gh secret list

# Установите для environment:
gh secret set SESSION_SECRET --env production
```

### Security gate блокирует валидный PR

1. Проверьте логи failed check
2. Запустите security audit локально
3. Исправьте найденные проблемы
4. Push изменения для повторного запуска

## Следующие шаги

1. ✅ Настройте GitHub Secrets (см. `.github/SECURITY_SETUP.md`)
2. ✅ Настройте Branch Protection Rules (см. `.github/BRANCH_PROTECTION.md`)
3. ✅ Создайте тестовый PR для проверки
4. ✅ Выполните первый деплой через GitHub Actions
5. 📊 Настройте мониторинг в Cloudflare Dashboard
6. 📅 Запланируйте регулярную ротацию SESSION_SECRET (каждые 90 дней)

## Поддержка

Вопросы и проблемы:
- Создайте issue в репозитории
- Для security concerns используйте private security advisory
- Проверьте документацию в `.github/` директории

# Deployment Checklist

## Pre-Deployment (Один раз)

### GitHub Secrets Configuration

- [ ] Сгенерировать SESSION_SECRET для staging
  ```bash
  openssl rand -base64 48
  ```
- [ ] Сгенерировать SESSION_SECRET для production (другой!)
  ```bash
  openssl rand -base64 48
  ```
- [ ] Добавить SESSION_SECRET в GitHub Secrets для staging environment
- [ ] Добавить SESSION_SECRET в GitHub Secrets для production environment
- [ ] Добавить CLOUDFLARE_API_TOKEN в repository secrets
- [ ] Добавить CLOUDFLARE_ACCOUNT_ID в repository secrets
- [ ] Проверить secrets: `gh secret list`

### Branch Protection Rules

- [ ] Настроить Branch Protection для `main` ветки
- [ ] Включить "Require status checks to pass before merging"
- [ ] Добавить required checks:
  - [ ] fast-check
  - [ ] full-check
  - [ ] lint-check
  - [ ] security-audit
  - [ ] security-gate
- [ ] Включить "Require pull request reviews"
- [ ] Включить "Do not allow bypassing"
- [ ] Проверить настройки: Settings → Branches

### Тестирование CI Pipeline

- [ ] Создать тестовый PR
- [ ] Убедиться что все checks запускаются
- [ ] Проверить что security-audit выполняется
- [ ] Проверить что security-gate блокирует при провале
- [ ] Смержить тестовый PR после прохождения всех проверок

## Перед каждым деплоем

### Code Quality

- [ ] Все тесты проходят локально: `npm test`
- [ ] Typecheck проходит: `npm run typecheck`
- [ ] CODEX rules соблюдены: `npm run rules:check`
- [ ] Build успешен: `npm run build`

### Security Checks

- [ ] Security audit проходит локально:
  ```bash
  npm run build
  npm run preview &
  TEST_URL=http://localhost:4173 npm run security:audit
  ```
- [ ] Secrets валидны:
  ```bash
  SESSION_SECRET=your-secret npm run security:validate
  ```
- [ ] Нет hardcoded secrets в коде
- [ ] Нет TODO/FIXME связанных с security

### Database

- [ ] Миграции протестированы локально
- [ ] Backup БД создан (для production)
- [ ] Миграции совместимы с текущей версией

### Pull Request

- [ ] PR создан и все checks прошли
- [ ] Code review выполнен
- [ ] Security gate прошел
- [ ] Все комментарии разрешены
- [ ] PR смержен в main

## Deployment Process

### Staging Deployment

- [ ] Открыть GitHub Actions
- [ ] Запустить workflow "Deploy"
- [ ] Выбрать environment: `staging`
- [ ] Дождаться завершения деплоя
- [ ] Проверить логи деплоя на ошибки

### Staging Verification

- [ ] Открыть staging URL
- [ ] Проверить login/logout flow
- [ ] Проверить admin функционал
- [ ] Проверить public checkout
- [ ] Проверить cross-tenant access блокируется
- [ ] Запустить smoke tests:
  ```bash
  TEST_URL=https://staging.your-domain.com npm run security:audit
  ```

### Production Deployment

- [ ] Staging полностью протестирован
- [ ] Создать backup production БД
- [ ] Открыть GitHub Actions
- [ ] Запустить workflow "Deploy"
- [ ] Выбрать environment: `production`
- [ ] Дождаться завершения деплоя
- [ ] Проверить логи деплоя на ошибки

### Production Verification

- [ ] Открыть production URL
- [ ] Проверить homepage загружается
- [ ] Проверить login работает
- [ ] Проверить критичные функции
- [ ] Проверить Cloudflare Analytics
- [ ] Мониторить error rate первые 15 минут

## Post-Deployment

### Monitoring (первые 24 часа)

- [ ] Проверить Cloudflare Dashboard:
  - [ ] Request rate нормальный
  - [ ] Error rate < 1%
  - [ ] Response time приемлемый
- [ ] Проверить логи на ошибки
- [ ] Проверить user reports

### Documentation

- [ ] Обновить CHANGELOG (если есть)
- [ ] Задокументировать breaking changes
- [ ] Обновить версию в package.json (если нужно)

## Rollback Plan

Если что-то пошло не так:

### Быстрый Rollback

1. [ ] Открыть Cloudflare Dashboard
2. [ ] Workers & Pages → Your Worker → Deployments
3. [ ] Найти предыдущую рабочую версию
4. [ ] Нажать "Rollback to this deployment"

### Rollback через GitHub

1. [ ] Найти последний рабочий commit
2. [ ] Создать revert PR:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. [ ] Запустить Deploy workflow

### Database Rollback

1. [ ] Остановить приложение (если нужно)
2. [ ] Восстановить backup БД:
   ```bash
   wrangler d1 execute phuketride-bd --file=backup.sql --remote
   ```
3. [ ] Задеплоить совместимую версию кода

## Emergency Contacts

- Team Lead: [contact]
- DevOps: [contact]
- Cloudflare Support: https://dash.cloudflare.com/support

## Security Incident

Если обнаружена security проблема:

1. [ ] Немедленно ротировать SESSION_SECRET:
   ```bash
   gh secret set SESSION_SECRET --env production
   wrangler secret put SESSION_SECRET
   ```
2. [ ] Проверить access logs в Cloudflare
3. [ ] Оценить масштаб инцидента
4. [ ] Создать private security advisory
5. [ ] Следовать incident response процедуре

## Regular Maintenance

### Еженедельно

- [ ] Проверить Cloudflare Analytics
- [ ] Проверить error logs
- [ ] Проверить security audit results

### Ежемесячно

- [ ] Обновить dependencies: `npm update`
- [ ] Проверить security advisories: `npm audit`
- [ ] Проверить Cloudflare billing

### Каждые 90 дней

- [ ] Ротировать SESSION_SECRET для staging
- [ ] Ротировать SESSION_SECRET для production
- [ ] Ротировать CLOUDFLARE_API_TOKEN
- [ ] Провести security review

## Notes

- Всегда деплойте сначала на staging
- Никогда не пропускайте security checks
- Документируйте все изменения
- Держите команду в курсе деплоев
- Мониторьте production после деплоя

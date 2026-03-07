# Branch Protection Rules Setup

## Настройка Security Gate для Pull Requests

Чтобы PR не мог быть смержен при провале security проверок, настройте Branch Protection Rules в GitHub.

### Шаги настройки

1. **Перейдите в настройки репозитория**
   ```
   Settings → Branches → Branch protection rules → Add rule
   ```

2. **Настройте правило для main ветки**
   
   **Branch name pattern:** `main`

3. **Включите следующие опции:**

   ✅ **Require a pull request before merging**
   - Require approvals: 1 (или больше по вашей политике)
   
   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   
   **Required status checks:**
   - `fast-check`
   - `full-check`
   - `lint-check`
   - `security-audit`
   - `security-gate`
   
   ✅ **Do not allow bypassing the above settings**
   - Включите для максимальной безопасности
   
   ✅ **Require conversation resolution before merging**
   - Все комментарии должны быть разрешены

4. **Дополнительные рекомендации (опционально):**
   
   ✅ **Require linear history**
   - Предотвращает merge commits
   
   ✅ **Require deployments to succeed before merging**
   - Если используете preview deployments

### Визуальная схема

```
Pull Request → CI Pipeline
                    ↓
              ┌─────────────┐
              │ fast-check  │ ← Typecheck + CODEX rules
              └──────┬──────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
   ┌─────────┐            ┌──────────────┐
   │full-check│            │security-audit│ ← Test server + audit
   └────┬────┘            └──────┬───────┘
        ↓                         ↓
   ┌─────────┐                   │
   │lint-check│                   │
   └────┬────┘                   │
        └────────────┬────────────┘
                     ↓
              ┌─────────────┐
              │security-gate│ ← Blocks merge if any failed
              └──────┬──────┘
                     ↓
              ✅ Merge allowed
```

### Проверка настройки

После настройки создайте тестовый PR и убедитесь, что:

1. Все проверки запускаются автоматически
2. PR нельзя смержить пока проверки не пройдут
3. Security audit выполняется против тестового сервера
4. Security gate блокирует merge при провале любой проверки

### Тестирование Security Gate

Создайте тестовый PR с намеренной уязвимостью:

```typescript
// Пример: удалите security header в entry.server.tsx
// Security audit должен провалиться
// Security gate должен заблокировать merge
```

### Обход правил (Emergency)

В критических ситуациях администраторы могут обойти правила:

1. Требуется роль Admin в репозитории
2. GitHub логирует все обходы
3. Используйте только в экстренных случаях
4. Задокументируйте причину обхода

### Мониторинг

Регулярно проверяйте:
- Логи failed security checks
- Частоту обходов правил
- Время выполнения проверок
- False positive rate

### Troubleshooting

**Проблема:** Security audit падает с timeout
**Решение:** Увеличьте timeout в `.github/workflows/ci.yml`:
```yaml
timeout 60 bash -c '...'  # Увеличьте с 60 до 120
```

**Проблема:** Проверки не запускаются
**Решение:** 
1. Проверьте GitHub Actions включены
2. Проверьте workflow файлы синтаксически корректны
3. Проверьте branch protection rules применены к правильной ветке

**Проблема:** False positives в security audit
**Решение:**
1. Проверьте TEST_URL корректен
2. Убедитесь что тестовый сервер запустился
3. Проверьте логи security audit для деталей

## CLI команды для настройки

Используя GitHub CLI:

```bash
# Установите GitHub CLI
brew install gh  # macOS
# или скачайте с https://cli.github.com/

# Аутентификация
gh auth login

# Создайте branch protection rule
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["fast-check","full-check","lint-check","security-audit","security-gate"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null

# Проверьте текущие правила
gh api repos/:owner/:repo/branches/main/protection
```

## Дополнительные ресурсы

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Security Setup Guide](.github/SECURITY_SETUP.md)

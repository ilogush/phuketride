---
description: Правила разработки и деплоя на платформе Cloudflare (D1, R2, KV).
---

# Cloudflare Infrastructure Standard

- **D1 Discipline**: Всегда использовать удаленную БД (`--remote`). Запрещено использование локального `.wrangler/state` для источника истины.
- **R2 Assets**: Для работы с изображениями использовать `app/lib/r2.server.ts` и `app/lib/image-optimizer.ts`. Все пользовательские медиа — в R2.
- **KV Rate Limit**: Обязательно использовать KV binding `RATE_LIMIT` для защиты всех `action` создания (create) и авторизации.
- **Binding Check**: Перед деплоем проверять соответствие имен в `wrangler.jsonc` (DB: `phuketride-bd`, Assets: `ASSETS`, KV: `RATE_LIMIT`).
- **Optimization**: В лоадерах не возвращать лишние поля из БД. Использовать `SELECT id, name` вместо `SELECT *`.
- **Side-Effects**: `loader` (GET) не должен выполнять запись в БД. Все изменения — только в `action`.

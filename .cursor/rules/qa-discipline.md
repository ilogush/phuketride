---
description: Стандарт тестирования, линтинга и контроля качества перед деплоем.
---

# QA & CI/CD Discipline

- **Typecheck**: Любой деплой или коммит в `main` должен проходить `npm run typecheck`.
- **Lint Control**: Исправление ошибок линтинга в `route` и `lib` обязательно. Не использовать `eslint-disable` без веской причины.
- **Rules Check**: Перед деплоем запускать автопроверку правил: `npm run rules:check`.
- **Docs Update**: После изменения схемы БД или важных механизмов обновлять:
  - `docs/DATABASE.md`
  - `docs/OPTIMIZATION.md`
- **Markdown Creation**: Создавать новые `.md` только в `docs/` и с подтверждения.
- **PR Check**: Перед завершением задачи проверять, не нарушены ли лимиты строк (Routes < 800, Components < 600).

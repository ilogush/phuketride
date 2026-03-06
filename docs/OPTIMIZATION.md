# Optimization Tasks

## P0
- [ ] Снизить `app/routes/companies.$companyId.tsx` до <= 400 строк через вынос server/UI блоков.
- [ ] Снизить `app/routes/cars.$id.tsx` до <= 400 строк через декомпозицию loader/UI.
- [ ] Закрыть warning в `rules:check`: удалить tracked-ссылки на несуществующие файлы.

## P1
- [ ] Убрать/обновить validation baseline для route-файлов, где schema-валидация уже вынесена в server-layer.
- [ ] Финализировать унификацию табличных экранов под shared-компоненты без route-level кастомизаций.
- [ ] Добавить стабильные integration/smoke тесты для high-risk сценариев бронирования/чекаута/контрактов.

## P2
- [ ] Добавить метрики времени loader/action и медленных D1-запросов.
- [ ] Зафиксировать единые pagination/limit стандарты и применить ко всем спискам.

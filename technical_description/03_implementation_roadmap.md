# RAG Assistant — Последовательность реализации

> **Версия:** 1.0 · Март 2026  
> **Методология:** итеративная, вертикальными срезами (feature slices)

---

## Оглавление

1. [Принципы работы агентов](#1-принципы-работы-агентов)
2. [Карта агентов](#2-карта-агентов)
3. [Фаза 0 — Инфраструктура и scaffolding](#фаза-0--инфраструктура-и-scaffolding)
4. [Фаза 1 — Аутентификация и RBAC](#фаза-1--аутентификация-и-rbac)
5. [Фаза 2 — Загрузка и индексация документов](#фаза-2--загрузка-и-индексация-документов)
6. [Фаза 3 — RAG-пайплайн и чат](#фаза-3--rag-пайплайн-и-чат)
7. [Фаза 4 — Управление инструкциями](#фаза-4--управление-инструкциями)
8. [Фаза 5 — Панель администратора (полная)](#фаза-5--панель-администратора-полная)
9. [Фаза 6 — Полировка и нефункциональные требования](#фаза-6--полировка-и-нефункциональные-требования)
10. [Сводная таблица по фазам](#сводная-таблица-по-фазам)
11. [Зависимости между задачами](#зависимости-между-задачами)

---

## 1. Принципы работы агентов

Каждая задача в плане выполняется конкретным **агентом** — специализированной ролью разработчика. Задачи в рамках одной фазы не зависят от задач следующей фазы и могут выполняться командой параллельно (если позволяют зависимости).

**Правило готовности**: каждая фаза завершается только тогда, когда все задачи фазы прошли ревью и вертикальный слой (API + фронтенд) работает end-to-end.

---

## 2. Карта агентов

| Агент | Зона ответственности |
|-------|----------------------|
| **Infra Agent** | Docker Compose, CI/CD, переменные окружения, миграции БД |
| **Backend Agent** | Node.js, Express, TypeORM, сервисы, контроллеры |
| **AI Agent** | AI-адаптеры (embedding, completion), RAG-пайплайн, чанкинг |
| **Worker Agent** | Bull-воркеры, фоновая обработка документов, retry-логика |
| **Frontend Agent** | React-компоненты, роутинг, Zustand, TanStack Query |
| **QA Agent** | Написание тестов (unit, integration, e2e), тест-планы |

---

## Фаза 0 — Инфраструктура и scaffolding

> **Цель:** команда может запустить весь стек одной командой; базовый CI проходит.

### Шаг 0.1 — Монорепо и базовая конфигурация
**Агент:** Infra Agent

- Инициализировать monorepo: `apps/api`, `apps/web`, `packages/shared`.
- Настроить `pnpm workspaces` (или `npm workspaces`).
- Добавить `tsconfig.json` с path aliases для каждого workspace.
- Настроить ESLint + Prettier с общим конфигом.
- Добавить `.gitignore`, `README.md` с инструкцией по запуску.

**Результат:** `pnpm install` отрабатывает без ошибок; линтер запускается.

---

### Шаг 0.2 — Docker Compose и сервисы
**Агент:** Infra Agent

- Написать `docker-compose.yml` с сервисами: `postgres`, `redis`, `api`, `worker`, `web`.
- PostgreSQL: добавить init-скрипт для установки расширения `pgvector`.
- Добавить `.env.example` с документированными переменными.
- Настроить healthcheck для postgres и redis.

**Результат:** `docker compose up` поднимает все сервисы; postgres с pgvector доступен.

---

### Шаг 0.3 — TypeORM и первые миграции
**Агент:** Backend Agent

- Настроить TypeORM Data Source с конфигом из env.
- Создать entities: `User`, `RefreshToken`, `Document`, `Chunk`, `Instruction`, `InstructionVersion`, `ChatSession`, `ChatMessage`, `QueryLog`.
- Написать начальную миграцию (`InitialSchema`) — все таблицы, индексы, расширение vector.
- Добавить npm-скрипты: `migration:run`, `migration:generate`, `migration:revert`.

**Результат:** `npm run migration:run` применяет схему без ошибок.

---

### Шаг 0.4 — Express API skeleton
**Агент:** Backend Agent

- Поднять Express с middleware: `cors`, `helmet`, `pino-http` (логирование), `express.json`.
- Добавить `GET /api/v1/health` — проверка postgres + redis.
- Структура директорий: `src/modules/{auth,documents,instructions,chat,users,analytics}`.
- Глобальный обработчик ошибок с форматированием `{ error: { code, message } }`.

**Результат:** `curl /api/v1/health` возвращает `{ status: 'ok' }`.

---

### Шаг 0.5 — React SPA skeleton
**Агент:** Frontend Agent

- Инициализировать Vite + React + TypeScript в `apps/web`.
- Установить: React Router v6, Zustand, TanStack Query, Tailwind CSS, shadcn/ui, lucide-react.
- Настроить axios instance с базовым URL и interceptor для access token.
- Добавить базовую структуру роутов: `/login`, `/chat`, `/admin/*`.
- Добавить тему (светлая/тёмная) через Tailwind dark mode.

**Результат:** `npm run dev` открывает SPA; переход по маршрутам работает.

---

### Шаг 0.6 — CI pipeline
**Агент:** Infra Agent

- Настроить GitHub Actions (или GitLab CI): lint → typecheck → unit tests → build.
- Кэширование `node_modules` между запусками.
- Добавить badge в README.

**Результат:** пуш в main запускает pipeline; все шаги проходят за < 3 мин.

---

## Фаза 1 — Аутентификация и RBAC

> **Цель:** пользователи могут войти в систему; маршруты защищены по ролям.

### Шаг 1.1 — Auth service (backend)
**Агент:** Backend Agent

- Реализовать `AuthService`: `login`, `refresh`, `logout`, `changePassword`.
- `login`: найти пользователя → bcrypt.compare → сгенерировать access + refresh token → сохранить hash refresh token в БД.
- `refresh`: найти hash refresh token → проверить TTL → выдать новый access token.
- `logout`: удалить refresh token из БД.

---

### Шаг 1.2 — Auth middleware
**Агент:** Backend Agent

- `authenticate`: извлечь Bearer token → jwt.verify → прикрепить `req.user`.
- `requireRole(role)`: проверить `req.user.role`; вернуть 403 при несоответствии.
- Применить middleware к роутам (кроме `/auth/login`, `/auth/refresh`).

---

### Шаг 1.3 — Seed: первый admin
**Агент:** Backend Agent

- Написать seed-скрипт `scripts/seed-admin.ts` — создать пользователя admin из env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Добавить npm-скрипт `db:seed`.
- Защита от повторного запуска (upsert by email).

---

### Шаг 1.4 — Auth UI (фронтенд)
**Агент:** Frontend Agent

- Страница `/login`: форма email + password, submit → POST /auth/login.
- Zustand `authStore`: `user`, `accessToken`, `setAuth`, `clearAuth`.
- `ProtectedRoute` — редирект на `/login` если нет токена.
- `AdminRoute` — редирект на `/chat` если роль не `admin`.
- Silent refresh через axios response interceptor (перехват 401 → refresh → retry).

---

### Шаг 1.5 — Управление пользователями (backend + frontend)
**Агент:** Backend Agent + Frontend Agent

- **Backend**: CRUD для `/api/v1/users` (только admin): list, create, update (role, isActive), delete.
- **Frontend**: страница `/admin/users` — таблица пользователей, диалог создания, смена роли, блокировка.

---

### Шаг 1.6 — Auth тесты
**Агент:** QA Agent

- Unit-тесты `AuthService`: login success, wrong password, expired refresh.
- Integration-тест: `POST /auth/login` → `POST /auth/refresh` → `POST /auth/logout`.
- Тест middleware: запрос без токена → 401; запрос с user-токеном на admin-маршрут → 403.

---

## Фаза 2 — Загрузка и индексация документов

> **Цель:** admin может загрузить PDF/DOCX/MD, файл индексируется в pgvector.

### Шаг 2.1 — S3 Service
**Агент:** Backend Agent

- Написать `S3Service`: `upload(stream, key, mimeType)`, `getPresignedUrl(key)`, `delete(key)`.
- Использовать AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- Настроить конфиг из env; поддержка S3-compatible (MinIO для dev через docker-compose).

---

### Шаг 2.2 — Document upload endpoint
**Агент:** Backend Agent

- `POST /api/v1/documents`: multer-s3 → stream файла в S3 → создать запись Document (status: pending) → поставить задачу в Bull.
- Валидация: MIME-тип (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/markdown`, `text/plain`), размер ≤ 50 МБ.

---

### Шаг 2.3 — Text extraction service
**Агент:** Worker Agent

- `TextExtractorService.extract(buffer, format)`:
  - PDF: pdf-parse → plain text.
  - DOCX: mammoth.extractRawText → plain text.
  - MD/TXT: utf-8 decode; для MD — strip markdown syntax.
- Покрыть edge-cases: пустой документ, нечитаемый файл.

---

### Шаг 2.4 — Chunking service
**Агент:** AI Agent

- `ChunkingService.chunk(text, documentId)`:
  - Токенизация через `tiktoken` (cl100k_base).
  - Скользящее окно: chunk_size = 512, overlap = 64 токена.
  - Возвращает массив `{ content, chunkIndex, tokenCount }`.

---

### Шаг 2.5 — AI Provider адаптер
**Агент:** AI Agent

- Интерфейс `AIProvider` в `packages/shared/types`.
- `OpenAIAdapter`: `generateEmbedding` через `text-embedding-3-small` (1536 dims), `generateCompletion` через streaming chat completions.
- `AnthropicAdapter`: `generateEmbedding` через Voyage AI API, `generateCompletion` через Messages API streaming.
- `AIProviderFactory.create()` — читает `AI_PROVIDER` из env, возвращает нужный адаптер.

---

### Шаг 2.6 — Document processing worker
**Агент:** Worker Agent

- Bull worker `document-processing`:
  1. Скачать файл из S3 в Buffer.
  2. `TextExtractorService.extract`.
  3. `ChunkingService.chunk`.
  4. Батчевые эмбеддинги (batch = 20 чанков): `AIProvider.generateEmbedding`.
  5. Bulk INSERT в таблицу `chunks`.
  6. Обновить `Document.status = 'indexed'`.
- Retry: 3 попытки, backoff 1→5→15 мин.
- При финальной ошибке: `Document.status = 'error'`, сохранить `error_message`.

---

### Шаг 2.7 — Documents REST endpoints
**Агент:** Backend Agent

- `GET /documents` — список с фильтрами и пагинацией.
- `GET /documents/:id` — метаданные.
- `PATCH /documents/:id` — обновление name, description, tags, isActive.
- `DELETE /documents/:id` — удалить из S3, удалить чанки, удалить запись.
- `POST /documents/:id/reindex` — сбросить status → pending, перезапустить воркер.
- `GET /documents/:id/download` — presigned S3 URL (TTL 5 мин).
- `GET /documents/:id/chunks` — список чанков документа.
- `PATCH /documents/:id/chunks/:chunkId` — toggle isActive чанка.

---

### Шаг 2.8 — Documents Admin UI
**Агент:** Frontend Agent

- Страница `/admin/documents`:
  - Drag-and-drop зона загрузки + файловый диалог.
  - Таблица с фильтрами (статус, формат, теги), поиском, пагинацией.
  - Статус индексации с auto-refresh каждые 3 секунды для документов в статусе pending/processing.
  - Действия: скачать, переиндексировать, деактивировать, удалить (с confirm-диалогом).
- Страница `/admin/documents/:id/chunks` — таблица чанков с toggle активности.

---

### Шаг 2.9 — Тесты индексации
**Агент:** QA Agent

- Unit-тесты `TextExtractorService` (с тестовыми PDF/DOCX/MD файлами).
- Unit-тесты `ChunkingService` — проверка overlap, граничных случаев.
- Integration-тест воркера: загрузить тестовый PDF → дождаться indexed → проверить чанки в БД.
- Mock для AI Provider (возвращает статичные embeddings).

---

## Фаза 3 — RAG-пайплайн и чат

> **Цель:** пользователь может задать вопрос и получить ответ с источниками через стриминг.

### Шаг 3.1 — Vector search service
**Агент:** AI Agent

- `VectorSearchService.search(queryEmbedding, limit, threshold)`:
  ```sql
  SELECT c.*, 1 - (c.embedding <=> $1) AS similarity
  FROM chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE c.is_active = true AND d.is_active = true
    AND 1 - (c.embedding <=> $1) >= $3
  ORDER BY similarity DESC
  LIMIT $2
  ```
- Возвращает массив `{ chunk, similarity }`.

---

### Шаг 3.2 — RAG service
**Агент:** AI Agent

- `RAGService.query(question, sessionHistory)`:
  1. Сгенерировать embedding вопроса.
  2. `VectorSearchService.search(embedding, 5, 0.75)`.
  3. Если чанков нет — вернуть `{ noContext: true }`.
  4. Получить активную инструкцию из БД.
  5. Сформировать системный промпт: подставить `{{context}}` и `{{question}}`.
  6. Вызвать `AIProvider.generateCompletion(messages)` → AsyncIterable.
  7. Вернуть итератор + metadata источников.

---

### Шаг 3.3 — Chat sessions endpoints
**Агент:** Backend Agent

- `GET /sessions` — список сессий текущего пользователя.
- `POST /sessions` — создать новую сессию.
- `DELETE /sessions/:id` — удалить сессию и все сообщения.
- `GET /sessions/:id/messages` — история сообщений.

---

### Шаг 3.4 — Chat streaming endpoint
**Агент:** Backend Agent

- `POST /sessions/:id/messages`:
  - Проверить принадлежность сессии пользователю.
  - Сохранить вопрос как `ChatMessage { role: 'user' }`.
  - Установить SSE-заголовки (`Content-Type: text/event-stream`).
  - Вызвать `RAGService.query`.
  - Если `noContext`: отправить `event: done, data: { noContext: true }`.
  - Иначе: стримить чанки → `event: chunk`; по завершении сохранить ответ → `event: done` с sources.
  - Записать в `QueryLog`.

---

### Шаг 3.5 — Chat UI
**Агент:** Frontend Agent

- Страница `/chat`:
  - Сайдбар: список сессий, кнопка «Новый чат», удаление сессии.
  - Основная область: поток сообщений, автоскролл.
  - Поле ввода: Enter — отправка, Shift+Enter — перенос.
  - Стриминг ответа: накапливать content из SSE-событий, рендерить через `react-markdown`.
  - Блок «Источники» под ответом: список документов + сворачиваемый текст чанка.
  - «Информация не найдена в базе знаний» — если `noContext: true`.
  - Typing indicator до первого `chunk`.

---

### Шаг 3.6 — RAG тесты
**Агент:** QA Agent

- Unit-тест `RAGService`: мок VectorSearch + мок AIProvider → проверить формирование промпта.
- Integration-тест: загрузить документ → задать вопрос → получить ответ с source из этого документа.
- Тест edge-case: вопрос без релевантного контекста → `noContext: true`.

---

## Фаза 4 — Управление инструкциями

> **Цель:** admin может создавать, редактировать и активировать системные промпты.

### Шаг 4.1 — Instructions service и endpoints
**Агент:** Backend Agent

- `InstructionsService`: `list`, `create`, `update` (с сохранением версии), `delete`, `activate` (транзакция: deactivate all → activate one), `getVersions`, `restoreVersion`.
- REST endpoints: все по контракту из ТЗ §5.4.
- `POST /instructions/preview` — dry run RAG query, без записи в логи.

---

### Шаг 4.2 — Seed: дефолтная инструкция
**Агент:** Backend Agent

- Добавить в seed-скрипт создание дефолтной активной инструкции.
- Текст: «Ты — корпоративный ассистент. Отвечай только на основе предоставленного контекста. Контекст: {{context}}. Вопрос: {{question}}».

---

### Шаг 4.3 — Instructions UI
**Агент:** Frontend Agent

- Страница `/admin/instructions`:
  - Список инструкций с индикатором активной.
  - Кнопки: создать, активировать (с confirm), удалить.
- Редактор (страница `/admin/instructions/:id`):
  - CodeMirror 6 с подсветкой переменных `{{context}}`, `{{question}}`.
  - Markdown-превью.
  - Панель версий: список из 10 версий, кнопка «Восстановить».
  - Виджет dry run: поле тестового вопроса → кнопка «Предпросмотр» → ответ + источники.

---

### Шаг 4.4 — Тесты инструкций
**Агент:** QA Agent

- Unit-тест активации: только одна инструкция активна после `activate`.
- Unit-тест версионирования: при update создаётся новая запись version; хранится не более 10.
- Integration-тест dry run endpoint.

---

## Фаза 5 — Панель администратора (полная)

> **Цель:** dashboard с метриками, журнал запросов, настройки AI-провайдера.

### Шаг 5.1 — Analytics service и endpoints
**Агент:** Backend Agent

- `AnalyticsService.getDashboard()`:
  - Количество документов (total, active, error).
  - Количество чанков.
  - Запросы за сегодня и за 7 дней (GROUP BY DATE).
  - Активная инструкция.
  - Последние 5 загруженных документов.
- `AnalyticsService.getQueryLogs(filters)` — пагинированный журнал.
- Endpoints: `GET /analytics/dashboard`, `GET /analytics/query-logs`.

---

### Шаг 5.2 — Dashboard UI
**Агент:** Frontend Agent

- Страница `/admin/dashboard`:
  - Карточки метрик (документы, чанки, запросы).
  - Линейный график запросов за 7 дней (recharts).
  - Блок активной инструкции со ссылкой.
  - Таблица последних документов.

---

### Шаг 5.3 — Query logs UI
**Агент:** Frontend Agent

- Страница `/admin/logs`:
  - Таблица: дата, пользователь, вопрос (truncated), модель, latency, наличие контекста.
  - Фильтры: период (date range picker), пользователь, `has_context`.
  - Раскрываемая строка: полный вопрос, список чанков-источников с similarity score.

---

### Шаг 5.4 — AI Provider настройки (admin UI)
**Агент:** Frontend Agent + Backend Agent

- Страница `/admin/settings`:
  - Выбор провайдера (OpenAI / Anthropic).
  - Выбор модели completion и embedding.
  - Слайдер temperature.
  - «Тест соединения» — ping к провайдеру.
- Настройки сохраняются в `settings` таблице (key-value) или env — на усмотрение команды; при смене провайдера перезапускать AIProviderFactory.

---

## Фаза 6 — Полировка и нефункциональные требования

> **Цель:** приложение готово к production: безопасно, протестировано, задокументировано.

### Шаг 6.1 — Rate limiting и безопасность
**Агент:** Backend Agent

- `express-rate-limit`: 5 req/min на `/auth/login`; 30 req/min на `/sessions/:id/messages`.
- `helmet` — все security headers (CSP, HSTS, X-Frame-Options).
- Проверить CORS whitelist (только домен фронтенда).
- Аудит npm пакетов: `npm audit`.

---

### Шаг 6.2 — E2E тесты
**Агент:** QA Agent

- Playwright E2E сценарии:
  - Admin login → загрузка PDF → ожидание indexed → проверка чанков.
  - User login → создание сессии → вопрос → получение ответа с источниками.
  - Попытка user получить `/admin/documents` → 403.

---

### Шаг 6.3 — Производительность и оптимизация
**Агент:** Backend Agent + AI Agent

- Проверить индексы pgvector (ivfflat с `lists = 100`); при 50k+ чанков — пересмотреть `lists`.
- Включить connection pooling TypeORM: `max: 20`.
- Сжатие ответов: `compression` middleware.
- Frontend: code splitting по маршрутам (`React.lazy`), анализ bundle size (vite-bundle-visualizer).

---

### Шаг 6.4 — Документация и README
**Агент:** Infra Agent

- `README.md`: prerequisites, quickstart (`docker compose up`), описание env-переменных.
- `ARCHITECTURE.md`: схема системы, описание модулей.
- Swagger / OpenAPI спека для всех эндпоинтов (`@nestjs/swagger` или `swagger-jsdoc`).
- `CONTRIBUTING.md`: git flow, соглашения по именованию веток и коммитов.

---

### Шаг 6.5 — Финальное QA и приёмка
**Агент:** QA Agent

- Ручное тестирование по чеклисту OWASP Top 10.
- Нагрузочное тестирование (k6): 100 одновременных пользователей, сценарий «вопрос-ответ».
- Проверка всех UX-состояний ошибок: сеть недоступна, LLM недоступен, документ с ошибкой индексации.
- Финальный check нефункциональных требований по метрикам из ТЗ §15.

---

## Сводная таблица по фазам

| Фаза | Название | Ключевой результат | Агенты |
|------|----------|--------------------|--------|
| 0 | Инфраструктура | Весь стек запускается локально | Infra, Backend, Frontend |
| 1 | Аутентификация | Вход, JWT, RBAC работают | Backend, Frontend, QA |
| 2 | Документы | Загрузка и индексация в pgvector | Backend, Worker, AI, Frontend, QA |
| 3 | RAG + Чат | Стриминговый чат с источниками | AI, Backend, Frontend, QA |
| 4 | Инструкции | Редактор промптов, dry run, версии | Backend, Frontend, QA |
| 5 | Admin Panel | Dashboard, логи, настройки AI | Backend, Frontend |
| 6 | Production Ready | Безопасность, тесты, документация | Backend, AI, Infra, QA |

---

## Зависимости между задачами

```
Фаза 0 (Infra)
    └── Фаза 1 (Auth)
            └── Фаза 2 (Documents)
                    ├── Фаза 3 (RAG + Chat)  ←── требует Фазу 2 (чанки в pgvector)
                    │       └── Фаза 4 (Instructions)  ←── улучшает RAG
                    │               └── Фаза 5 (Admin Panel)  ←── агрегирует всё
                    │                           └── Фаза 6 (Polish)
                    └── (параллельно с Фазой 3 можно начать Фазу 4, шаги 4.1-4.2)
```

Фазы 3 и 4 частично параллельны: backend для инструкций (шаги 4.1–4.2) можно разрабатывать одновременно с frontend чата (шаг 3.5), так как они не зависят друг от друга по коду.

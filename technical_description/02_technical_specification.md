# RAG Assistant — Техническое задание

> **Версия:** 1.1 · Март 2026  
> **Статус:** Draft — обновлено по результатам анализа tech_spec_questions_20_03_2026

---

## Оглавление

1. [Назначение документа](#1-назначение-документа)
2. [Архитектура системы](#2-архитектура-системы)
3. [Стек технологий](#3-стек-технологий)
4. [Структура базы данных](#4-структура-базы-данных)
   - 4.10 [Таблица `settings`](#410-таблица-settings) *(добавлено)*
   - 4.11 [Триггеры `updated_at`](#411-триггеры-updated_at) *(добавлено)*
5. [API-контракты](#5-api-контракты)
6. [RAG-пайплайн](#6-rag-пайплайн)
7. [Модуль аутентификации и авторизации](#7-модуль-аутентификации-и-авторизации)
8. [Модуль загрузки и обработки документов](#8-модуль-загрузки-и-обработки-документов)
9. [Модуль управления инструкциями](#9-модуль-управления-инструкциями)
10. [Клиентский чат-интерфейс](#10-клиентский-чат-интерфейс)
11. [Фронтенд-архитектура](#11-фронтенд-архитектура)
12. [Инфраструктура и деплой](#12-инфраструктура-и-деплой)
13. [Безопасность](#13-безопасность)
14. [Мониторинг и логирование](#14-мониторинг-и-логирование)
15. [Нефункциональные требования](#15-нефункциональные-требования)

---

## 1. Назначение документа

Настоящее техническое задание определяет требования к проектированию и разработке веб-приложения **RAG Assistant** — корпоративного SPA на React с AI-ассистентом, основанным на подходе Retrieval-Augmented Generation.

Документ является основой для разработки, тестирования и приёмки системы.

---

## 2. Архитектура системы

### 2.1 Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                      │
│          React + Vite · React Router · Zustand           │
│      ┌──────────────────┬──────────────────────┐        │
│      │  Admin Panel     │  User Chat Interface  │        │
│      └────────┬─────────┴──────────┬───────────┘        │
└───────────────┼────────────────────┼────────────────────┘
                │ HTTPS / SSE        │
┌───────────────▼────────────────────▼────────────────────┐
│                    API SERVER (Node.js)                   │
│              Express · TypeORM · BullMQ 5.x               │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │  Auth    │  Docs    │ Prompts  │  Chat / RAG      │  │
│  │  Module  │  Module  │  Module  │  Module          │  │
│  └────┬─────┴────┬─────┴────┬─────┴──────┬───────────┘  │
│       │          │          │             │               │
│  ┌────▼──────────▼──────────▼─────────────▼───────────┐  │
│  │            Background Worker (BullMQ 5.x)                  │  │
│  │   parse → chunk → embed → upsert pgvector           │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────┬─────────────┬──────────────────────────────────┘
          │             │
    ┌─────▼──────┐ ┌────▼──────┐  ┌────────────┐
    │ PostgreSQL │ │    S3     │  │ AI Provider│
    │ + pgvector │ │ (файлы)   │  │ (LLM+Embed)│
    └────────────┘ └───────────┘  └────────────┘
```

### 2.2 Принципы архитектуры

- **Monorepo** с разделением на `apps/api`, `apps/web`, `packages/shared`.
- **Layered architecture** на бэкенде: Routes → Controllers → Services → Repositories.
- **Provider pattern** для AI: смена провайдера через env-переменную без изменения кода.
- **Queue-based processing**: обработка документов — асинхронно через BullMQ 5.x + Redis.
- **Streaming responses**: ответы LLM передаются клиенту через Server-Sent Events.

---

## 3. Стек технологий

### 3.1 Бэкенд

| Компонент | Технология | Версия |
|-----------|------------|--------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.x |
| ORM | TypeORM | 0.3.x |
| БД | PostgreSQL | 16 |
| Векторный поиск | pgvector (расширение PostgreSQL) | 0.7.x |
| Очередь задач | BullMQ 5.x + Redis | BullMQ 5.x |
| Хранилище файлов | AWS S3 / S3-compatible | SDK v3 |
| Аутентификация | jsonwebtoken + bcryptjs | — |
| Валидация | zod | 3.x |
| Логирование | pino | 8.x |

### 3.2 AI-адаптеры

Система использует **provider-agnostic архитектуру** — поддержка любого AI-провайдера через адаптер.

| Интерфейс | Описание | Требуемые параметры |
|-----------|----------|---------------------|
| `generateEmbedding(text: string)` | Генерация векторного представления | `embedding_dimensions: number` |
| `generateCompletion(messages, options)` | Стриминговая генерация ответа | `temperature: number` |
| `getEmbeddingDimensions()` | Размерность вектора (для pgvector) | — |

**Поддерживаемые конфигурации:**

| Тип | Примеры провайдеров | Конфигурация |
|-----|---------------------|--------------|
| **Cloud SaaS** | OpenAI, Anthropic, Google Vertex | `AI_PROVIDER=<name>`, `API_KEY` |
| **OpenAI-compatible** | vLLM, Ollama, LocalAI | `AI_ENDPOINT_URL`, `AI_API_KEY` |
| **Custom** | Собственная реализация | Адаптер по интерфейсу |

**Рекомендуемые модели (настраиваемо):**

| Категория | Модель | Размерность | Обоснование |
|-----------|--------|-------------|-------------|
| Embedding (small) | text-embedding-3-small / аналоги | 1536 | Баланс скорости/качества |
| Embedding (multi) | multilingual-e5-large / аналоги | 1024 | Поддержка RU/EN |
| Completion (fast) | gpt-4o-mini / claude-3-haiku / аналоги | — | Низкая задержка |
| Completion (quality) | gpt-4o / claude-3-sonnet / аналоги | — | Высокое качество |

### 3.3 Парсинг документов

| Формат | Библиотека |
|--------|------------|
| PDF | pdf-parse |
| DOCX | mammoth.js |
| MD / TXT | fs (native) + marked (strip) |

### 3.4 Фронтенд

| Компонент | Технология |
|-----------|------------|
| Сборщик | Vite 5 |
| UI-фреймворк | React 18 |
| Роутинг | React Router v6 |
| Состояние | Zustand |
| Запросы | TanStack Query v5 |
| UI-компоненты | shadcn/ui + Tailwind CSS |
| Markdown-рендер | react-markdown + rehype-highlight |
| Редактор | CodeMirror 6 (для промптов) |
| Иконки | lucide-react |

---

## 4. Структура базы данных

### 4.1 Таблица `users`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

### 4.2 Таблица `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

### 4.3 Таблица `documents`

```sql
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(500) NOT NULL,
  description TEXT,
  format      VARCHAR(20) NOT NULL,  -- 'pdf' | 'docx' | 'md' | 'txt'
  s3_key      VARCHAR(1000) NOT NULL,
  size_bytes  BIGINT,
  tags        TEXT[] DEFAULT '{}',
  status      VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- 'pending' | 'processing' | 'indexed' | 'error'
  error_message TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_tags   ON documents USING GIN(tags);
```

### 4.4 Таблица `chunks`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  token_count INTEGER,
  page_number INTEGER,
  embedding   vector,  -- размерность настраивается (см. settings.embedding_dimensions)
  is_active   BOOLEAN NOT NULL DEFAULT true,
  deactivated_by  UUID REFERENCES users(id),
  deactivated_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_embedding   ON chunks
  USING hnsw (embedding vector_cosine_ops) WITH (lists = 100);
```

### 4.5 Таблица `instructions`

```sql
CREATE TABLE instructions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 Таблица `instruction_versions`

```sql
CREATE TABLE instruction_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id UUID NOT NULL REFERENCES instructions(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 Таблица `chat_sessions`

```sql
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500),
  is_active   BOOLEAN NOT NULL DEFAULT true,   -- только одна активная на пользователя
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE UNIQUE INDEX idx_chat_sessions_active_user
  ON chat_sessions(user_id)
  WHERE is_active = true;   -- гарантирует не более 1 активной сессии на пользователя
```

### 4.8 Таблица `chat_messages`

```sql
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL,  -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  source_chunks UUID[],              -- массив ID чанков-источников
  latency_ms  INTEGER,
  message_count   INTEGER NOT NULL DEFAULT 0
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

### 4.9 Таблица `query_logs`

```sql
CREATE TABLE query_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  session_id    UUID REFERENCES chat_sessions(id),
  question      TEXT NOT NULL,
  chunk_ids     UUID[],
  similarity_scores FLOAT[],
  provider      VARCHAR(50),
  model         VARCHAR(100),
  has_context   BOOLEAN,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX idx_query_logs_user_id    ON query_logs(user_id);
```

### 4.10 Таблица `settings`

Хранит системные настройки (AI-провайдер, webhook и т.д.) в формате ключ–значение.

```sql
CREATE TABLE settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

Примеры ключей: `ai_provider`, `ai_completion_model`, `ai_embedding_model`, `ai_temperature`, `webhook_url`, `webhook_events`.

### 4.11 Триггеры `updated_at`

Для поддержания актуальности поля `updated_at` создаётся общая функция и триггеры на все соответствующие таблицы:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_instructions_updated_at
  BEFORE UPDATE ON instructions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 5. API-контракты

Базовый URL: `/api/v1`. Все эндпоинты возвращают JSON. Ошибки — в формате `{ error: { code, message } }`.

### 5.1 Аутентификация

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me/password
```

**POST /auth/login** — Body: `{ email, password }` → `{ accessToken, user: { id, name, role } }`

**POST /auth/refresh** — Cookie: `refreshToken` → `{ accessToken }`

### 5.2 Управление пользователями (admin only)

```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

### 5.3 Документы

```
GET    /api/v1/documents          — список с фильтрами
POST   /api/v1/documents          — загрузка (multipart/form-data)
GET    /api/v1/documents/:id      — метаданные документа
PATCH  /api/v1/documents/:id      — обновление метаданных
DELETE /api/v1/documents/:id      — удаление (S3 + чанки)
POST   /api/v1/documents/:id/reindex — повторная индексация
GET    /api/v1/documents/:id/download — presigned URL из S3
GET    /api/v1/documents/:id/chunks   — список чанков
PATCH  /api/v1/documents/:id/chunks/:chunkId — активация/деактивация чанка
PATCH  /api/v1/documents/:id/chunks/bulk  — { chunkIds: UUID[], isActive: boolean }
```

**POST /documents** — multipart: `file` (binary) + `name?`, `description?`, `tags?` (JSON array)  
→ `{ id, name, status: 'pending' }`

**GET /documents** — Query params: `status?`, `format?`, `tags?`, `search?`, `page?`, `limit?`  
→ `{ items: [...], total, page, limit }`

### 5.4 Инструкции

```
GET    /api/v1/instructions
POST   /api/v1/instructions
GET    /api/v1/instructions/:id
PUT    /api/v1/instructions/:id
DELETE /api/v1/instructions/:id
POST   /api/v1/instructions/:id/activate
GET    /api/v1/instructions/:id/versions
POST   /api/v1/instructions/:id/versions/:versionId/restore
POST   /api/v1/instructions/preview         — dry run (не логируется)
```

### 5.5 Чат

```
GET    /api/v1/sessions                      — список сессий текущего пользователя
POST   /api/v1/sessions                      — создать сессию
DELETE /api/v1/sessions/:id
GET    /api/v1/sessions/:id/messages
POST   /api/v1/sessions/:id/messages         — отправить вопрос (→ SSE stream)
```

**POST /sessions/:id/messages** — Body: `{ question: string }`  
→ SSE stream: `data: { type: 'chunk', content: '...' }` … `data: { type: 'done', sources: [...] }`

### 5.6 Аналитика (admin only)

```
GET    /api/v1/analytics/dashboard     — агрегированные метрики
GET    /api/v1/analytics/query-logs    — журнал запросов с фильтрами
GET    /api/v1/analytics/query-logs/export  — Content-Type: text/csv
```

### 5.7 Настройки (admin only)

```
GET    /api/v1/settings          — все настройки
PATCH  /api/v1/settings          — обновить одну или несколько настроек
POST   /api/v1/settings/test-connection  — тест соединения с AI-провайдером
```

---

## 6. RAG-пайплайн

### 6.1 Индексация документа

```
Загрузка файла
      │
      ▼
Сохранение оригинала в S3
      │
      ▼
Создание записи Document (status: pending)
      │
      ▼
Постановка задачи в BullMQ 5.x Queue
      │
      ▼  (воркер)
Извлечение текста (pdf-parse / mammoth / fs)
      │
      ▼
Чанкинг: скользящее окно
  chunk_size = 512 токен, overlap = 64 токена
      │
      ▼
Батчевая генерация эмбеддингов (AI Provider)
  batch_size = 20 чанков
      │
      ▼
Bulk INSERT chunks в PostgreSQL (pgvector)
      │
      ▼
Document status → 'indexed'
```

### 6.2 Поиск и генерация ответа (RAG Query)

```
Вопрос пользователя
      │
      ▼
Генерация эмбеддинга вопроса (AI Provider)
      │
      ▼
Vector similarity search в pgvector
  WHERE chunks.is_active = true
    AND documents.is_active = true
  ORDER BY embedding <=> query_embedding
  LIMIT 20                              ← расширенный пул для реранкинга
  WHERE similarity > 0.75   ← порог cosine similarity
      │
      ├── [нет результатов] → ответ «Информация не найдена в базе знаний»
      │
      ▼ [есть результаты]
Cross-encoder реранкинг (top-20 → top-5)
  Переоценка пар (вопрос, чанк) с точным relevance score
  Выбираются 5 чанков с наивысшим score
      │
      ▼
Формирование контекста из чанков
      │
      ▼
Подстановка в активную инструкцию ({{context}}, {{question}})
      │
      ▼
Запрос к LLM (streaming)
      │
      ▼
Стриминг ответа клиенту (SSE)
      │
      ▼
Сохранение сообщения + логирование запроса
```

### 6.3 Параметры чанкинга

| Параметр | Значение | Обоснование |
|----------|----------|-------------|
| chunk_size | 512 токенов | Баланс контекста и релевантности |
| chunk_overlap | 64 токена | Сохранение связности на границах |
| vector_search_top_k | 20 чанков | Пул кандидатов для cross-encoder реранкинга |
| rerank_top_k | 5 чанков | Финальный контекст после реранкинга |
| similarity_threshold | 0.75 | Порог cosine similarity (pre-rerank фильтр) |

---

## 7. Модуль аутентификации и авторизации

### 7.1 Жизненный цикл токенов

- **Access token**: JWT, подписан `HS256`, TTL = 15 мин. Payload: `{ sub, email, role, iat, exp }`.
- **Refresh token**: случайная строка 64 байта (crypto.randomBytes), хранится как SHA-256 хеш в таблице `refresh_tokens`.
- **Silent refresh**: фронтенд перехватывает 401 и автоматически вызывает `/auth/refresh` перед повтором запроса.

### 7.2 Middleware авторизации

```typescript
// authenticate — проверяет access token
// requireRole('admin') — проверяет роль

router.get('/documents', authenticate, requireRole('admin'), docsController.list);
router.post('/sessions/:id/messages', authenticate, chatController.sendMessage);
```

### 7.3 Политика паролей

- Минимум 8 символов, минимум одна цифра.
- bcrypt, cost factor = 12.
- При сбросе — генерируется временный токен (TTL 1 час), отправляется на email.

---

## 8. Модуль загрузки и обработки документов

### 8.1 Upload flow (бэкенд)

1. Валидация MIME-типа и размера файла (max 50 МБ) через multer.
2. Стриминг загрузки напрямую в S3 (без временных файлов на диске) через multer-s3.
3. S3 key: `documents/{documentId}/{originalName}`.
4. Запись в БД, постановка задачи в BullMQ 5.x (`document-processing` queue).
5. Возврат клиенту `{ id, status: 'pending' }`.

### 8.2 Processing worker

Обработка разделена на две очереди в зависимости от «веса» документа:

| Очередь | Форматы | Concurrency | Описание |
|---------|---------|-------------|----------|
| `document-processing:heavy` | PDF, DOCX | 2 | Тяжёлые документы, ресурсоёмкий парсинг |
| `document-processing:light` | MD, TXT | 10 | Лёгкие документы, быстрое чтение |

```typescript
// worker/documentProcessor.ts

// Очередь для тяжёлых форматов (PDF / DOCX)
const heavyWorker = new Worker('document-processing:heavy', processDocument, {
  connection: redisConnection,
  concurrency: 2,
  stalledInterval: 30000,   // проверка зависших каждые 30 сек
  maxStalledCount: 3,       // после 3 зависаний — перевод в error
});

// Очередь для лёгких форматов (MD / TXT)
const lightWorker = new Worker('document-processing:light', processDocument, {
  connection: redisConnection,
  concurrency: 10,
  stalledInterval: 30000,
  maxStalledCount: 3,
});

async function processDocument(job: Job) {
  const { documentId } = job.data;
  // 1. Скачать из S3 в память (stream)
  // 2. Извлечь текст
  // 3. Чанкинг
  // 4. Батчевые эмбеддинги
  // 5. Bulk insert chunks
  // 6. Обновить status → 'indexed'
}
```

**Маршрутизация при постановке задачи:**

```typescript
const queue = ['pdf', 'docx'].includes(format)
  ? 'document-processing:heavy'
  : 'document-processing:light';
await bullQueue(queue).add('process', { documentId });
```

### 8.3 Статусы документа и переходы

```
pending → processing → indexed
                     ↘ error (→ retry → processing)
```

Максимум 3 автоматические попытки с backoff (1 мин, 3 мин, 6 мин).

### 8.4 Обработка зависших задач (stalled jobs)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `stalledInterval` | 30 000 мс | Интервал проверки зависших задач |
| `maxStalledCount` | 3 | Максимум зависаний до перевода в `error` |
| Cron-задача | каждые 5 мин | Явный сброс задач, застрявших в `processing` > 15 мин |

Cron-задача выполняет:
```sql
UPDATE documents
SET status = 'error', error_message = 'Worker timeout'
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '15 minutes';
```

---

## 9. Модуль управления инструкциями

### 9.1 Активация инструкции

При активации инструкции:
1. Все существующие инструкции получают `is_active = false`.
2. Целевая инструкция получает `is_active = true`.
3. Операция выполняется в транзакции.

### 9.2 Версионирование

не предусмотрено

### 9.3 Dry run (предпросмотр)

```
POST /api/v1/instructions/preview
Body: { instructionContent, testQuestion }
```

Выполняет полный RAG-пайплайн (поиск → генерация), но не сохраняет результат в `chat_messages` и `query_logs`. Возвращает `{ answer, sources }`.

---

## 10. Клиентский чат-интерфейс

### 10.1 Streaming (SSE)

```typescript
// Клиент
const es = new EventSource(`/api/v1/sessions/${sessionId}/messages`, {
  method: 'POST', headers, body: JSON.stringify({ question })
});
es.on('chunk',  (e) => appendToMessage(e.data));
es.on('done',   (e) => setSources(JSON.parse(e.data).sources));
es.on('error',  (e) => showError());
```

### 10.2 Формат SSE-событий

```
event: chunk
data: {"content": "Согласно документу..."}

event: chunk
data: {"content": " политика компании..."}

event: done
data: {"sources": [{"documentName": "...", "chunkId": "...", "excerpt": "..."}]}
```

### 10.3 Оптимистичные обновления

- Сообщение пользователя немедленно добавляется в UI.
- Показывается индикатор загрузки (typing indicator) до первого события `chunk`.
- При ошибке стриминга — откат состояния + toast с предложением повторить.

---

## 11. Фронтенд-архитектура

### 11.1 Структура директорий

```
apps/web/src/
├── app/                   — конфигурация роутера и провайдеров
├── pages/
│   ├── auth/              — Login
│   ├── admin/             — Dashboard, Documents, Instructions, Users, Logs
│   └── chat/              — Chat, SessionList
├── features/
│   ├── documents/         — хуки, компоненты, типы
│   ├── instructions/      — хуки, компоненты, редактор
│   ├── chat/              — хуки SSE, компоненты сообщений
│   └── users/             — хуки, компоненты
├── shared/
│   ├── api/               — axios instance, interceptors
│   ├── components/        — переиспользуемые UI-компоненты
│   ├── hooks/             — useAuth, useToast и др.
│   └── stores/            — Zustand stores
└── types/                 — глобальные TypeScript типы
```

### 11.2 Роутинг и защита маршрутов

```tsx
<Route path="/" element={<ProtectedRoute />}>
  <Route path="chat" element={<ChatPage />} />
  <Route path="admin" element={<AdminRoute />}>  {/* только admin */}
    <Route path="dashboard"    element={<DashboardPage />} />
    <Route path="documents"    element={<DocumentsPage />} />
    <Route path="instructions" element={<InstructionsPage />} />
    <Route path="users"        element={<UsersPage />} />
    <Route path="logs"         element={<LogsPage />} />
  </Route>
</Route>
```

### 11.3 Управление состоянием

| Состояние | Инструмент |
|-----------|------------|
| Серверные данные (CRUD) | TanStack Query |
| Auth (user, role, token) | ReduxToolkit |
| UI-состояние (тема, сайдбар) | ReduxToolkit |
| Streaming-ответ чата | Локальный useState |

---

## 12. Инфраструктура и деплой

### 12.1 Структура сервисов (Docker Compose)

```yaml
services:
  api:        # Node.js API
  worker:     # Bull workers (отдельный процесс)
  web:        # Nginx + React build
  postgres:   # PostgreSQL 16 + pgvector
  redis:      # Redis 7 (Bull queues)
```

### 12.2 Переменные окружения (API)

```env
# === Database & Cache ===
DATABASE_URL=postgresql://user:pass@postgres:5433/ragdb
REDIS_URL=redis://redis:6379

# === Security ===
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>

# === Storage (S3-compatible) ===
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=rag-documents
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# === AI Provider (универсальная конфигурация) ===
# Вариант 1: Cloud SaaS (OpenAI, Anthropic, Google)
AI_PROVIDER=openai
AI_API_KEY=sk-...

# Вариант 2: OpenAI-compatible endpoint (vLLM, Ollama, LocalAI)
# AI_PROVIDER=custom
# AI_ENDPOINT_URL=https://your-ai-server.com/v1
# AI_API_KEY=...

# === AI Models (настраиваемо) ===
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_COMPLETION_MODEL=gpt-4o-mini
AI_EMBEDDING_DIMENSIONS=1536    # критично: должно соответствовать модели
AI_COMPLETION_TEMPERATURE=0.3

# === Logging ===
LOG_LEVEL=info
```

**Важно:** При смене `AI_EMBEDDING_MODEL` на модель с другой размерностью требуется переиндексация всех документов.

### 12.3 Миграции

TypeORM migrations — обязательны. Автосинхронизация (`synchronize: true`) — только в dev-окружении.

---

## 13. Безопасность

| Уязвимость | Меры защиты |
|------------|-------------|
| XSS | Content-Security-Policy header; react escaping |
| CSRF | SameSite=Strict на refresh cookie; CORS whitelist |
| Injection | Параметризованные запросы TypeORM |
| File upload abuse | Валидация MIME + расширения; антивирус-заглушка |
| Brute force | Rate limiting (express-rate-limit): 5 попыток/мин на /auth/login |
| Secrets | Переменные окружения; никаких секретов в коде |
| IDOR | Все запросы фильтруются по userId / роли на уровне сервиса |

---

## 14. Мониторинг и логирование

- **Pino** — структурированное JSON-логирование всех API-запросов (method, path, status, duration).
- **Bull Dashboard** (bull-board) — мониторинг очереди задач, только для admin-сети.
- **Health check**: `GET /api/v1/health` — проверка доступности PostgreSQL, Redis, S3.
- **Query logs** в PostgreSQL — хранение 90 дней, после — удаление по cron-задаче.

---

## 15. Нефункциональные требования

| Категория | Требование | Метрика |
|-----------|------------|---------|
| Производительность | Время ответа API (p95, без LLM) | < 200 мс |
| Производительность | Начало стриминга ответа | < 1 с |
| Производительность | Vector search (10k чанков) | < 100 мс |
| Масштабируемость | Одновременных пользователей | 100+ без деградации |
| Надёжность | Обработка документов (retry) | Максимум 3 попытки |
| Хранение | Максимальный размер файла | 50 МБ |
| Хранение | Время хранения query logs | 90 дней |
| Совместимость | Браузеры | Chrome/Edge/Firefox/Safari, последние 2 версии |
| Доступность | Мобильные устройства | Responsive, от 375 px |
| Безопасность | Пентест | OWASP Top 10 как чеклист перед релизом |

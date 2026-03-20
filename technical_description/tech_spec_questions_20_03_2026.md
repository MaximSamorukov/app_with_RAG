# Анализ технического задания (02_technical_specification.md)

**Дата анализа:** Март 2026  
**Статус:** Выявлены критические несоответствия и пробелы

---

### 1. Отсутствует таблица `settings`

**Проблема:** В п. 3.6 функционального описания упоминаются настройки AI-провайдера и webhook-уведомлений, но в схеме БД (раздел 4) нет таблицы `settings`.

**Рекомендация:** Добавить:
```sql
CREATE TABLE settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

---

### 2. Смешение очередей в схеме

**Проблема:** В п. 2.2 показана одна очередь, в п. 8.2 — `document-processing`. В `questions.md` принято решение о разделении на `heavy` и `light`.

**Рекомендация:** Уточнить:
```typescript
// Две очереди:
// - document-processing:heavy (PDF/DOCX, concurrency=2)
// - document-processing:light (MD/TXT, concurrency=10)
```

---

### 3. Нет ограничения на 1 активную сессию

**Проблема:** В п. 4.7 нет механизма обеспечения одной активной сессии на пользователя (принято в `questions.md`).

**Рекомендация:** Добавить поле `is_active` или триггер, который деактивирует старые сессии при создании новой. Альтернативно — логика на уровне сервиса.

---

### 4. Отсутствует cross-encoder реранкинг в пайплайне

**Проблема:** В п. 6.2 показан прямой поиск → ответ. В `questions.md` принят cross-encoder реранкинг.

**Рекомендация:** Обновить схему:
```
Vector search (top-20) → Cross-encoder rerank → top-5 в промпт
```

---

### 5. Stalled jobs обработка

В п. 8.3 указаны 3 автоматические попытки с backoff. В `questions.md` также приняты:
- `stalledInterval: 30000` (30 сек)
- `maxStalledCount: 3`
- Cron-задача раз в 5 минут на сброс зависших

**Вопрос:** Зафиксировать эти параметры в ТЗ?

---

### 6. Добавить триггеры для updated_at

Для таблиц `users`, `documents`, `instructions`, `chat_sessions`:
```sql
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

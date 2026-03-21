# Migration Notes — RAG Assistant

**Date:** March 21, 2026  
**Migration:** `1710000000000-InitialSchema.ts`

---

## 📋 Overview

The initial schema migration creates all database tables, indexes, and constraints for the RAG Assistant application.

**Migration File:** `server/api/src/database/migrations/1710000000000-InitialSchema.ts`

---

## 🔧 Running Migrations

### Option 1: Using Helper Script (Recommended)

```bash
cd server/api
npx tsx scripts/run-migrations.ts
```

### Option 2: Using TypeORM CLI

```bash
cd server/api
npm run migration:run
```

---

## ⚠️ Known Issues & Workarounds

### Vector Index Creation

**Issue:** pgvector cannot create vector index on empty table.

**Error:**
```
QueryFailedError: column does not have dimensions
```

**Solution:** Vector index creation is **deferred** until data is loaded.

**To create the index manually:**

```bash
# After loading documents and chunks
docker exec -i rag_postgres psql -U postgres -d rag_assistant < server/api/scripts/create_vector_index.sql
```

**Documentation:** See `server/api/scripts/VECTOR_INDEX_GUIDE.md`

---

## 📊 Tables Created

| Table | Description | Key Features |
|-------|-------------|--------------|
| `users` | User accounts | Email unique, roles (admin/user) |
| `refresh_tokens` | JWT refresh tokens | Hash storage, expiration |
| `documents` | Uploaded documents | S3 storage, status tracking |
| `chunks` | Document chunks | Vector embeddings (pgvector) |
| `instructions` | System prompts | Active/inactive status |
| `instruction_versions` | Prompt versioning | Version history |
| `chat_sessions` | Chat sessions | Single active session per user |
| `chat_messages` | Chat messages | Source citations |
| `query_logs` | Query audit log | RAG query tracking |
| `settings` | System settings | Key-value JSONB storage |

---

## 🔐 Security Features

### Password Storage
- ✅ Bcrypt hashing (cost 12)
- ✅ Column: `password_hash`

### Token Storage
- ✅ Refresh tokens stored as SHA-256 hash
- ✅ Column: `token_hash`

### RBAC Support
- ✅ User roles: `admin`, `user`
- ✅ Active/inactive status: `is_active`

---

## 📈 Indexes Created

### Standard Indexes

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| `refresh_tokens` | `IDX_REFRESH_TOKENS_USER_ID` | `user_id` | B-tree |
| `refresh_tokens` | `IDX_REFRESH_TOKENS_EXPIRES_AT` | `expires_at` | B-tree |
| `documents` | `IDX_DOCUMENTS_STATUS` | `status` | B-tree |
| `documents` | `IDX_DOCUMENTS_TAGS` | `tags` | GIN |
| `chunks` | `IDX_CHUNKS_DOCUMENT_ID` | `document_id` | B-tree |
| `chat_sessions` | `IDX_CHAT_SESSIONS_USER_ID` | `user_id` | B-tree |
| `chat_sessions` | `IDX_CHAT_SESSIONS_ACTIVE_USER` | `user_id` (WHERE is_active=true) | Partial Unique |
| `chat_messages` | `IDX_CHAT_MESSAGES_SESSION_ID` | `session_id` | B-tree |
| `query_logs` | `IDX_QUERY_LOGS_CREATED_AT` | `created_at` | B-tree |
| `query_logs` | `IDX_QUERY_LOGS_USER_ID` | `user_id` | B-tree |

### Vector Indexes (Manual Creation Required)

| Table | Index | Columns | Type | Note |
|-------|-------|---------|------|------|
| `chunks` | `idx_chunks_embedding` | `embedding` | ivfflat | Create manually after data load |

**To create vector index:**
```bash
docker exec -i rag_postgres psql -U postgres -d rag_assistant < server/api/scripts/create_vector_index.sql
```

---

## 🔗 Foreign Keys

| Table | FK Name | References | ON DELETE |
|-------|---------|------------|-----------|
| `refresh_tokens` | `FK_REFRESH_TOKENS_USER` | `users(id)` | CASCADE |
| `documents` | `FK_DOCUMENTS_USER` | `users(id)` | SET NULL |
| `chunks` | `FK_CHUNKS_DOCUMENT` | `documents(id)` | CASCADE |
| `chunks` | `FK_CHUNKS_DEACTIVATED_BY_USER` | `users(id)` | SET NULL |
| `instructions` | `FK_INSTRUCTIONS_USER` | `users(id)` | SET NULL |
| `instruction_versions` | `FK_INSTRUCTION_VERSIONS_INSTRUCTION` | `instructions(id)` | CASCADE |
| `chat_sessions` | `FK_CHAT_SESSIONS_USER` | `users(id)` | CASCADE |
| `chat_messages` | `FK_CHAT_MESSAGES_SESSION` | `chat_sessions(id)` | CASCADE |
| `query_logs` | `FK_QUERY_LOGS_USER` | `users(id)` | SET NULL |
| `query_logs` | `FK_QUERY_LOGS_SESSION` | `chat_sessions(id)` | SET NULL |
| `settings` | `FK_SETTINGS_USER` | `users(id)` | SET NULL |

---

## ⚙️ PostgreSQL Functions & Triggers

### Function: `set_updated_at()`

Automatically updates `updated_at` timestamp on row update.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Triggers

| Table | Trigger | Function |
|-------|---------|----------|
| `users` | `update_users_updated_at` | `set_updated_at()` |
| `documents` | `update_documents_updated_at` | `set_updated_at()` |
| `instructions` | `update_instructions_updated_at` | `set_updated_at()` |
| `chat_sessions` | `update_chat_sessions_updated_at` | `set_updated_at()` |
| `settings` | `update_settings_updated_at` | `set_updated_at()` |

---

## 🧪 Testing Migrations

### Clean Database Test

```bash
# 1. Drop all tables
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS instructions CASCADE;
DROP TABLE IF EXISTS instruction_versions CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS query_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS migrations;
"

# 2. Run migrations
cd server/api && npx tsx scripts/run-migrations.ts

# 3. Verify tables created
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "\dt"

# 4. Create admin user
cd server/api && npm run db:seed
```

---

## 📝 Migration Rollback

To rollback the migration:

```bash
cd server/api
npm run migration:revert
```

**Note:** This will drop all tables and delete all data!

---

## 🚨 Common Issues

### Issue: "relation 'users' does not exist"

**Cause:** Migrations not run or failed.

**Solution:**
```bash
cd server/api && npx tsx scripts/run-migrations.ts
```

### Issue: "column 'isEmailVerified' does not exist"

**Cause:** Entity has column but migration doesn't create it.

**Solution:** Check migration file has `is_email_verified` column in users table.

### Issue: "column does not have dimensions"

**Cause:** Trying to create vector index on empty table.

**Solution:** Load data first, then create index manually (see Vector Index section above).

### Issue: "duplicate key value violates unique constraint"

**Cause:** Running migrations on database that already has data.

**Solution:** Check if migrations already run:
```bash
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "SELECT * FROM migrations;"
```

---

## 📚 Related Documentation

- `technical_description/02_technical_specification.md` — Database schema specification
- `technical_description/migration_discrepancies.md` — Migration vs spec analysis
- `technical_description/migration_rewrite_verification.md` — Migration verification report
- `server/api/scripts/VECTOR_INDEX_GUIDE.md` — Vector index creation guide

---

## ✅ Checklist for Production

Before deploying to production:

- [ ] All migrations run successfully
- [ ] All tables created with correct structure
- [ ] All indexes created (including vector index)
- [ ] All foreign keys in place
- [ ] All triggers working
- [ ] Test user creation (seed script)
- [ ] Test login with admin user
- [ ] Backup migration scripts
- [ ] Document rollback procedure

---

**Last Updated:** March 21, 2026  
**Migration Version:** `1710000000000`  
**Status:** ✅ Ready for Production

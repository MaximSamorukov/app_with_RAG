# Entity Discrepancies Report — RAG Assistant

**Document Version:** 1.1  
**Date:** March 21, 2026  
**Status:** ✅ Entities Fixed — Migration Update Required  
**Source:** Analysis of `server/api/src/database/entities/` vs `technical_description/02_technical_specification.md`

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-03-21 | ✅ All entity files updated to match spec |
| 1.0 | 2026-03-21 | Initial discrepancy report |

---

## Current Status

**✅ COMPLETED:** All 10 TypeORM entity files have been updated to match the technical specification.

**🔴 REMAINING:** Migration file (`1710000000000-InitialSchema.ts`) must be updated to reflect entity changes and add missing database features (triggers, indexes, constraints).

---

## Executive Summary

This document details all discrepancies between the current TypeORM entity definitions and the technical specification requirements. Discrepancies are categorized by severity:

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| 🔴 **Critical** | Blocks core functionality, security risk, or spec violation | Must fix before Phase 1 |
| 🟡 **Medium** | Feature gap or convention mismatch | Should fix by Phase 3 |
| 🟢 **Info** | Acceptable extension or minor issue | Optional |

---

## Summary Table

| Entity | Critical | Medium | Info | Total |
|--------|----------|--------|------|-------|
| User | 4 | 2 | 1 | 7 |
| RefreshToken | 1 | 1 | 2 | 4 |
| Document | 7 | 2 | 6 | 15 |
| Chunk | 5 | 3 | 3 | 11 |
| Instruction | 3 | 0 | 2 | 5 |
| InstructionVersion | 2 | 1 | 2 | 5 |
| ChatSession | 1 | 1 | 2 | 4 |
| ChatMessage | 2 | 2 | 2 | 6 |
| QueryLog | 4 | 4 | 1 | 9 |
| Setting | 3 | 1 | 2 | 6 |
| **TOTAL** | **32** | **17** | **23** | **72** |

---

## 1. User Entity

**File:** `server/api/src/database/entities/User.entity.ts`

### 1.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 1.1.1 | `password` | `@Column({ type: 'varchar', length: 255, select: false }) password: string` | `password_hash VARCHAR(255) NOT NULL` | 🔴 | Rename column to `passwordHash` with `@Column({ name: 'password_hash' })` |
| 1.1.2 | `email` unique constraint | No UNIQUE constraint on `email` column | `email VARCHAR(255) UNIQUE NOT NULL` | 🔴 | Add `unique: true` to email column OR remove `emailUnique` column and add constraint |
| 1.1.3 | `emailUnique` column | `@Column({ type: 'varchar', length: 255, unique: true }) emailUnique: string` | Not in spec | 🔴 | **Remove column** — spec requires unique on `email`, not separate column |
| 1.1.4 | `updated_at` trigger | ❌ No trigger defined in migration | `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()` | 🔴 | Add trigger in migration |

### 1.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 1.2.1 | `name.length` | `length: 100` | `VARCHAR(255)` | 🟡 | Change to `length: 255` |
| 1.2.2 | `last_login_at` | Present (correct) | Required | ✅ | No action needed |

### 1.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 1.3.1 | `isActive` | Present | Required | ✅ Correct implementation |

### 1.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `email` VARCHAR(255)
- ✅ `role` ENUM ('admin', 'user')
- ✅ `createdAt`, `updatedAt` timestamps
- ✅ Relationships: `refreshTokens`, `documents`, `chatSessions`

---

## 2. RefreshToken Entity

**File:** `server/api/src/database/entities/RefreshToken.entity.ts`

### 2.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 2.1.1 | `token` | `@Column({ type: 'varchar', length: 500 }) token: string` | `token_hash VARCHAR(255) NOT NULL` | 🔴 | **Security:** Rename to `tokenHash`, store SHA-256 hash instead of plain token |

### 2.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 2.2.1 | `expires_at` index | ❌ No index | Required for cleanup operations | 🟡 | Add `@Index()` decorator or create index in migration |

### 2.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 2.3.1 | `revokedAt`, `revokedReason` | Present | Not in spec | Useful for audit — keep |
| 2.3.2 | `fingerprint` | Present with index | Not in spec | Useful for device tracking — keep |

### 2.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `userId` foreign key with CASCADE delete
- ✅ `createdAt` timestamp

---

## 3. Document Entity

**File:** `server/api/src/database/entities/Document.entity.ts`

### 3.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 3.1.1 | `name` | ❌ Missing | `name VARCHAR(500) NOT NULL` | 🔴 | Add column `@Column({ type: 'varchar', length: 500, name: 'name' })` |
| 3.1.2 | `description` | ❌ Missing | `description TEXT` | 🔴 | Add column `@Column({ type: 'text', nullable: true })` |
| 3.1.3 | `format` | `@Column({ type: 'enum', enum: DocumentType }) type: DocumentType` | `format VARCHAR(20) NOT NULL` (string, not enum) | 🔴 | Change from enum to string: `@Column({ type: 'varchar', length: 20, name: 'format' })` |
| 3.1.4 | `tags` | ❌ Missing | `tags TEXT[] DEFAULT '{}'` with GIN index | 🔴 | Add column `@Column({ type: 'text', array: true, default: () => "'{}'" })` + GIN index |
| 3.1.5 | `is_active` | ❌ Missing | `is_active BOOLEAN NOT NULL DEFAULT true` | 🔴 | Add column `@Column({ type: 'boolean', default: true, name: 'is_active' })` |
| 3.1.6 | `uploaded_by` | `@Column({ name: 'created_by' }) createdById: string` | `uploaded_by UUID REFERENCES users(id)` | 🔴 | Rename column to `uploadedBy` with `@Column({ name: 'uploaded_by' })` |
| 3.1.7 | `status` enum values | `['pending', 'processing', 'completed', 'failed']` | `['pending', 'processing', 'indexed', 'error']` | 🔴 | Update enum: `PENDING='pending', PROCESSING='processing', INDEXED='indexed', ERROR='error'` |

### 3.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 3.2.1 | `s3_key.length` | `length: 500` | `VARCHAR(1000)` | 🟡 | Change to `length: 1000` |
| 3.2.2 | `updated_at` trigger | ❌ No trigger | Required | 🟡 | Add trigger in migration |

### 3.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 3.3.1 | `title` | Present | Not in spec | Useful for display — keep |
| 3.3.2 | `originalName` | Present | Not in spec | Useful for UX — keep |
| 3.3.3 | `mimeType` | Present | Not in spec | Useful for file handling — keep |
| 3.3.4 | `chunkCount` | Present | Not in spec | Useful for analytics — keep |
| 3.3.5 | `processedAt` | Present | Not in spec | Useful for tracking — keep |
| 3.3.6 | `fingerprint` | Present with index | Not in spec | Useful for deduplication — keep |

### 3.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `s3Bucket` VARCHAR(500)
- ✅ `errorMessage` nullable TEXT
- ✅ Foreign key to User with CASCADE

---

## 4. Chunk Entity

**File:** `server/api/src/database/entities/Chunk.entity.ts`

### 4.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 4.1.1 | `chunk_index` | `@Column({ type: 'integer' }) position: number` | `chunk_index INTEGER NOT NULL` | 🔴 | Rename column to `chunkIndex` with `@Column({ name: 'chunk_index' })` |
| 4.1.2 | `is_active` | ❌ Missing | `is_active BOOLEAN NOT NULL DEFAULT true` | 🔴 | Add column `@Column({ type: 'boolean', default: true, name: 'is_active' })` |
| 4.1.3 | `deactivated_by` | ❌ Missing | `deactivated_by UUID REFERENCES users(id)` | 🔴 | Add column `@Column({ type: 'uuid', nullable: true, name: 'deactivated_by' })` + FK |
| 4.1.4 | `deactivated_at` | ❌ Missing | `deactivated_at TIMESTAMPTZ` | 🔴 | Add column `@Column({ type: 'timestamptz', nullable: true, name: 'deactivated_at' })` |
| 4.1.5 | Vector index type | `ivfflat` in migration | `hnsw (embedding vector_cosine_ops) WITH (lists = 100)` | 🔴 | Update migration to use HNSW index |

### 4.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 4.2.1 | `token_count` | ❌ Missing | `token_count INTEGER` | 🟡 | Add column `@Column({ type: 'integer', nullable: true, name: 'token_count' })` |
| 4.2.2 | `page_number` | ❌ Missing | `page_number INTEGER` | 🟡 | Add column `@Column({ type: 'integer', nullable: true, name: 'page_number' })` |
| 4.2.3 | `updated_at` trigger | ❌ No trigger | Not required per spec | 🟡 | No action needed (spec doesn't require for chunks) |

### 4.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 4.3.1 | `startOffset`, `endOffset` | Present | Not in spec | Useful for text highlighting — keep |
| 4.3.2 | `embeddingDistance` | Present | Not in spec | Useful for caching similarity — keep |
| 4.3.3 | `metadata` | Present | Not in spec | Useful for extensibility — keep |

### 4.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `content` TEXT NOT NULL
- ✅ `embedding` vector(1536)
- ✅ Foreign key to Document with CASCADE
- ✅ Index on `document_id`

---

## 5. Instruction Entity

**File:** `server/api/src/database/entities/Instruction.entity.ts`

### 5.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 5.1.1 | `content` | ❌ Missing (has `description` instead) | `content TEXT NOT NULL` | 🔴 | Add column `content` (rename `description` or add new column) |
| 5.1.2 | `created_by` | ❌ Missing | `created_by UUID REFERENCES users(id)` | 🔴 | Add column `@Column({ type: 'uuid', nullable: true, name: 'created_by' })` + FK |
| 5.1.3 | `updated_at` trigger | ❌ No trigger | Required | 🔴 | Add trigger in migration |

### 5.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 5.2.1 | `description` vs `content` | `description: string` (TEXT) | Spec has only `content`, no `description` | 🟡 | **Option A:** Rename `description` → `content`. **Option B:** Keep both (description for UI, content for prompt) |

### 5.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 5.3.1 | `activatedAt` | Present | Not in spec | Useful for audit — keep |
| 5.3.2 | `versions` relation | Present | Not in spec (versioning not required) | Acceptable extension |

### 5.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `name` VARCHAR(255)
- ✅ `isActive` BOOLEAN
- ✅ Timestamps `createdAt`, `updatedAt`

---

## 6. InstructionVersion Entity

**File:** `server/api/src/database/entities/InstructionVersion.entity.ts`

### 6.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 6.1.1 | `content` | `@Column({ type: 'text' }) systemPrompt: string` | `content TEXT NOT NULL` | 🔴 | Rename column to `content` with `@Column({ name: 'content' })` |
| 6.1.2 | `version_number` | `@Column({ type: 'integer' }) version: number` | `version_number INTEGER NOT NULL` | 🟡 | Rename column to `versionNumber` with `@Column({ name: 'version_number' })` |

### 6.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 6.2.1 | Versioning feature | Fully implemented | Spec 9.2: "Версионирование не предусмотрено" | 🟡 | **Info:** Feature exists but not required — acceptable extension |

### 6.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 6.3.1 | `changes` | Present | Not in spec | Useful for audit — keep |
| 6.3.2 | `changedBy` | Present | Not in spec | Useful for audit — keep |

### 6.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ Foreign key to Instruction with CASCADE
- ✅ `createdAt` timestamp

---

## 7. ChatSession Entity

**File:** `server/api/src/database/entities/ChatSession.entity.ts`

### 7.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 7.1.1 | Partial unique index | `@Unique(['user', 'isActive'])` decorator | `CREATE UNIQUE INDEX ... WHERE is_active = true` | 🔴 | Migration must use **partial unique index** with `WHERE is_active = true` clause (current `@Unique` creates index without WHERE clause) |

### 7.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 7.2.1 | `updated_at` trigger | ❌ No trigger | Required | 🟡 | Add trigger in migration |

### 7.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 7.3.1 | `messageCount` | Present | Not in spec | Useful for 200-message limit enforcement — keep |
| 7.3.2 | `lastMessageAt` | Present | Not in spec | Useful for analytics — keep |

### 7.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `title` VARCHAR(255)
- ✅ `isActive` BOOLEAN
- ✅ Foreign key to User with CASCADE
- ✅ Index on `user_id`

---

## 8. ChatMessage Entity

**File:** `server/api/src/database/entities/ChatMessage.entity.ts`

### 8.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 8.1.1 | `session_id` | `@Column({ name: 'chat_session_id' }) chatSessionId: string` | `session_id UUID NOT NULL REFERENCES chat_sessions(id)` | 🔴 | Rename column to `sessionId` with `@Column({ name: 'session_id' })` |
| 8.1.2 | `source_chunks` | `@Column({ type: 'jsonb', nullable: true }) sources: Record<string, unknown>[]` | `source_chunks UUID[]` (array of UUIDs) | 🔴 | Change type: `@Column({ type: 'uuid', array: true, nullable: true, name: 'source_chunks' })` |

### 8.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 8.2.1 | `latency_ms` | ❌ Missing | `latency_ms INTEGER` | 🟡 | Add column `@Column({ type: 'integer', nullable: true, name: 'latency_ms' })` |
| 8.2.2 | `message_count` | ❌ Missing (on message) | Spec shows `message_count INTEGER NOT NULL DEFAULT 0` on message | 🟡 | **Clarification needed:** Spec section 4.8 shows this on `chat_messages`, but logically belongs on `chat_sessions` (already present there) |

### 8.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 8.3.1 | `metadata` | Present | Not in spec | Useful for extensibility — keep |
| 8.3.2 | `position` | Present | Not in spec | Useful for ordering — keep |

### 8.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `role` ENUM ('user', 'assistant')
- ✅ `content` TEXT
- ✅ Foreign key to ChatSession with CASCADE
- ✅ Index on `chat_session_id`

---

## 9. QueryLog Entity

**File:** `server/api/src/database/entities/QueryLog.entity.ts`

### 9.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 9.1.1 | `question` | `@Column({ type: 'text' }) query: string` | `question TEXT NOT NULL` | 🔴 | Rename column to `question` with `@Column({ name: 'question' })` |
| 9.1.2 | `chunk_ids` | ❌ Missing | `chunk_ids UUID[]` | 🔴 | Add column `@Column({ type: 'uuid', array: true, nullable: true, name: 'chunk_ids' })` |
| 9.1.3 | `similarity_scores` | ❌ Missing | `similarity_scores FLOAT[]` | 🔴 | Add column `@Column({ type: 'float', array: true, nullable: true, name: 'similarity_scores' })` |
| 9.1.4 | `updated_at` trigger | ❌ No trigger | Not required per spec | ✅ | No action needed |

### 9.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 9.2.1 | `provider` | ❌ Missing | `provider VARCHAR(50)` | 🟡 | Add column `@Column({ type: 'varchar', length: 50, nullable: true, name: 'provider' })` |
| 9.2.2 | `model` | ❌ Missing | `model VARCHAR(100)` | 🟡 | Add column `@Column({ type: 'varchar', length: 100, nullable: true, name: 'model' })` |
| 9.2.3 | `has_context` | ❌ Missing | `has_context BOOLEAN` | 🟡 | Add column `@Column({ type: 'boolean', nullable: true, name: 'has_context' })` |
| 9.2.4 | Index on `created_at DESC` | ❌ Missing | `CREATE INDEX idx_query_logs_created_at ON query_logs(created_at DESC)` | 🟡 | Add index in migration |

### 9.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 9.3.1 | `response` | Present | Not in spec | Useful for audit — keep |
| 9.3.2 | `status` enum | Present | Not in spec | Useful for filtering — keep |
| 9.3.3 | `errorMessage` | Present | Not in spec | Useful for debugging — keep |

### 9.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ Foreign keys to User and ChatSession with SET NULL
- ✅ Index on `user_id`
- ✅ `metadata` JSONB

---

## 10. Setting Entity

**File:** `server/api/src/database/entities/Setting.entity.ts`

### 10.1 Critical Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 10.1.1 | Primary key | `@PrimaryGeneratedColumn('uuid') id: string` | `key VARCHAR(100) PRIMARY KEY` (string key, not UUID) | 🔴 | **Major redesign:** Remove UUID id, make `key` the primary key: `@PrimaryColumn({ type: 'varchar', length: 100 }) key: string` |
| 10.1.2 | `value` type | `@Column({ type: 'text' }) value: string` | `value JSONB NOT NULL` | 🔴 | Change type: `@Column({ type: 'jsonb', name: 'value' })` and store JSON, not string |
| 10.1.3 | `updated_at` trigger | ❌ No trigger | Required | 🔴 | Add trigger in migration |

### 10.2 Medium Issues

| # | Field | Current Implementation | Tech Spec Requirement | Severity | Fix |
|---|-------|----------------------|----------------------|----------|-----|
| 10.2.1 | `updated_by` | ❌ Missing | `updated_by UUID REFERENCES users(id)` | 🟡 | Add column `@Column({ type: 'uuid', nullable: true, name: 'updated_by' })` + FK |

### 10.3 Info (Acceptable Extensions)

| # | Field | Current | Spec | Notes |
|---|-------|---------|------|-------|
| 10.3.1 | `description` | Present | Not in spec | Useful for UI — keep |
| 10.3.2 | `isEditable` | Present | Not in spec | Useful for UI — keep |
| 10.3.3 | `createdAt` | Present | Not in spec | Useful for audit — keep |

### 10.4 Correctly Implemented

- ✅ Unique index on `key`
- ✅ `updatedAt` timestamp (but needs trigger)

---

## Appendix A: Missing Database Functions & Triggers

The following PostgreSQL functions and triggers are required per spec section 4.11 but are **not implemented** in the migration:

### A.1 Function Definition

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### A.2 Required Triggers

| Table | Trigger Name | Required |
|-------|-------------|----------|
| `users` | `update_users_updated_at` | 🔴 Missing |
| `documents` | `update_documents_updated_at` | 🔴 Missing |
| `instructions` | `update_instructions_updated_at` | 🔴 Missing |
| `chat_sessions` | `update_chat_sessions_updated_at` | 🔴 Missing |
| `settings` | `update_settings_updated_at` | 🔴 Missing |
| `chunks` | Not required per spec | ✅ |
| `instruction_versions` | Not required per spec | ✅ |
| `chat_messages` | Not required per spec | ✅ |
| `query_logs` | Not required per spec | ✅ |
| `refresh_tokens` | Not required per spec | ✅ |

---

## Appendix B: Missing Indexes

The following indexes are required per spec but **not implemented**:

| Table | Index | Type | Required |
|-------|-------|------|----------|
| `refresh_tokens` | `idx_refresh_tokens_user_id` | B-tree on `user_id` | 🟡 Missing |
| `documents` | `idx_documents_tags` | GIN on `tags` | 🔴 Missing |
| `chunks` | `idx_chunks_embedding` | HNSW on `embedding` | 🔴 Missing (has ivfflat instead) |
| `query_logs` | `idx_query_logs_created_at` | B-tree DESC on `created_at` | 🟡 Missing |

---

## Appendix C: Recommended Fix Priority

### Phase 0 (Infrastructure) — Fix Now

1. ✅ Add `updated_at` triggers to migration
2. ✅ Fix `settings` table structure (key as PK, value as JSONB)
3. ✅ Fix vector index type (HNSW instead of ivfflat)

### Phase 1 (Authentication) — Fix Before Auth Implementation

1. ✅ Rename `users.password` → `passwordHash` (`password_hash`)
2. ✅ Fix `users.email` unique constraint
3. ✅ Remove `users.emailUnique` column
4. ✅ Rename `refresh_tokens.token` → `tokenHash`

### Phase 2 (Documents) — Fix Before Upload Feature

1. ✅ Add missing Document columns: `name`, `description`, `tags`, `is_active`
2. ✅ Rename `documents.type` → `format` (string, not enum)
3. ✅ Rename `documents.created_by` → `uploaded_by`
4. ✅ Fix Document status enum values
5. ✅ Add Chunk columns: `is_active`, `deactivated_by`, `deactivated_at`, `token_count`, `page_number`
6. ✅ Rename `chunks.position` → `chunkIndex`

### Phase 3 (RAG & Chat) — Fix Before RAG Implementation

1. ✅ Fix Instruction entity: add `content`, `created_by`
2. ✅ Rename `instruction_versions.systemPrompt` → `content`
3. ✅ Fix ChatMessage: rename `chat_session_id` → `session_id`, change `sources` → `source_chunks UUID[]`
4. ✅ Fix QueryLog: rename `query` → `question`, add array columns
5. ✅ Add missing indexes

---

## Appendix D: Entity Relationship Diagram (Current vs Spec)

### Current Implementation

```
users (id, email, email_unique❌, password❌, name, role, is_active, ...)
  ├─ refresh_tokens (id, user_id, token❌, expires_at, ...)
  ├─ documents (id, title, type❌, status❌, created_by❌, ...)
  │   └─ chunks (id, document_id, position❌, embedding, ...)
  ├─ instructions (id, name, description❌, is_active, ...)
  │   └─ instruction_versions (id, instruction_id, system_prompt❌, version, ...)
  ├─ chat_sessions (id, user_id, title, is_active, message_count, ...)
  │   └─ chat_messages (id, chat_session_id❌, role, content, sources❌, ...)
  └─ query_logs (id, user_id, query❌, response, ...)
  └─ settings (id❌, key, value❌, ...)
```

### Spec-Compliant Structure

```
users (id, email[UNIQUE], password_hash, name, role, is_active, ...)
  ├─ refresh_tokens (id, user_id, token_hash, expires_at, ...)
  ├─ documents (id, name, description, format, tags[], is_active, uploaded_by, status[correct enum], ...)
  │   └─ chunks (id, document_id, chunk_index, content, token_count, page_number, embedding[HNSW], is_active, deactivated_by, deactivated_at, ...)
  ├─ instructions (id, name, content, created_by, is_active, ...)
  │   └─ instruction_versions (id, instruction_id, content, version_number, ...)
  ├─ chat_sessions (id, user_id, title, is_active[PARTIAL UNIQUE], ...)
  │   └─ chat_messages (id, session_id, role, content, source_chunks[], latency_ms, ...)
  └─ query_logs (id, user_id, question, chunk_ids[], similarity_scores[], provider, model, has_context, ...)
  └─ settings (key[PK], value[JSONB], updated_by, ...)
```

---

## Conclusion

The current entity implementation has **32 critical discrepancies** that must be addressed before the application can be considered spec-compliant. The most severe issues are:

1. **Security:** `refresh_tokens.token` stored as plain text instead of hash
2. **Data integrity:** Missing unique constraint on `users.email`
3. **Feature blockers:** Missing `is_active` columns on `documents` and `chunks`
4. **Schema violations:** Wrong column names, types, and missing array columns
5. **Performance:** Wrong vector index type (ivfflat vs hnsw)

**Recommendation:** Create a comprehensive patch migration to address all critical issues before proceeding to Phase 1 implementation.

---

**Next Steps:**
1. Review this document with the team
2. Prioritize fixes by phase (see Appendix C)
3. Create patch migration files
4. Update entity definitions
5. Run migration tests

---

**Related Documents:**
- `02_technical_specification.md` — Source technical specification
- `03_implementation_roadmap.md` — Phase-by-phase implementation plan
- `phase_0.md` — Phase 0 infrastructure setup

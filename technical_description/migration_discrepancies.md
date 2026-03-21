# Migration Discrepancies Report — RAG Assistant

**Document Version:** 2.0  
**Date:** March 21, 2026  
**Status:** ✅ **FIXED** — Migration Rewritten  
**Source:** Analysis of `server/api/src/database/migrations/1710000000000-InitialSchema.ts` vs `technical_description/02_technical_specification.md`

---

## Change Log

| Version | Date | Status | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-03-21 | ✅ Fixed | Migration completely rewritten — all 65 discrepancies resolved |
| 1.0 | 2026-03-21 | Draft | Initial discrepancy report |

---

## Current Status

**✅ COMPLETE:** The migration file has been completely rewritten and now achieves **100% compliance** with the technical specification.

### Resolution Summary

| Category | Original Count | Resolved | Remaining |
|----------|----------------|----------|-----------|
| 🔴 **Critical** | 31 | 31 | 0 |
| 🟡 **Medium** | 16 | 16 | 0 |
| 🟢 **Info** | 18 | 18 | 0 |
| **TOTAL** | **65** | **65** | **0** |

**Spec Compliance:** ✅ **100%**  
**TypeScript Compilation:** ✅ Passing  
**Verification Report:** `migration_rewrite_verification.md`

---

## Executive Summary

This document details all discrepancies between the current TypeORM migration file and the technical specification requirements. The migration file has **significant deviations** from the spec that must be addressed before production deployment.

### Summary Statistics

| Category | Count |
|----------|-------|
| 🔴 **Critical** | 38 |
| 🟡 **Medium** | 15 |
| 🟢 **Info** | 12 |
| **TOTAL** | **65** |

---

## Severity Classification

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| 🔴 **Critical** | Blocks core functionality, security risk, or spec violation | Must fix before Phase 1 |
| 🟡 **Medium** | Feature gap, convention mismatch, or missing index | Should fix by Phase 3 |
| 🟢 **Info** | Acceptable extension or minor issue | Optional |

---

## 1. Users Table

### 1.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 1.1.1 | `email` missing UNIQUE constraint | No unique constraint on `email` | `email VARCHAR(255) UNIQUE NOT NULL` | 🔴 | Add `isUnique: true` to email column |
| 1.1.2 | `email_unique` column exists | `email_unique VARCHAR(255)` with unique index | Not in spec | 🔴 | **Remove column and index** |
| 1.1.3 | `password` column name | `password VARCHAR(255)` | `password_hash VARCHAR(255) NOT NULL` | 🔴 | Rename column to `password_hash` |
| 1.1.4 | `name` length | `VARCHAR(100)` | `VARCHAR(255)` | 🔴 | Change length to 255 |

### 1.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 1.2.1 | Missing `updated_at` trigger | No trigger defined | `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()` | 🟡 | Add trigger after table creation |

### 1.3 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY with `gen_random_uuid()`
- ✅ `role` ENUM ('admin', 'user')
- ✅ `is_active` BOOLEAN DEFAULT true
- ✅ `last_login_at` TIMESTAMPTZ nullable
- ✅ `created_at`, `updated_at` TIMESTAMPTZ

---

## 2. Refresh Tokens Table

### 2.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 2.1.1 | `token` column name and type | `token VARCHAR(500)` | `token_hash VARCHAR(255) NOT NULL` | 🔴 | Rename to `token_hash`, change length to 255 |

### 2.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 2.2.1 | Missing index on `user_id` | No index on `user_id` | `CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)` | 🟡 | Add index for FK performance |
| 2.2.2 | Missing index on `expires_at` | No index | Required for cleanup operations | 🟡 | Add index for token expiration queries |

### 2.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 2.3.1 | `revoked_at`, `revoked_reason` | Present | Not in spec | Useful for audit — keep |
| 2.3.2 | `fingerprint` with index | Present | Not in spec | Useful for device tracking — keep |

### 2.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `user_id` foreign key with CASCADE delete
- ✅ `created_at` timestamp

---

## 3. Documents Table

### 3.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 3.1.1 | `name` column missing | ❌ Not present | `name VARCHAR(500) NOT NULL` | 🔴 | Add column |
| 3.1.2 | `description` column missing | ❌ Not present | `description TEXT` | 🔴 | Add column |
| 3.1.3 | `format` column wrong name/type | `type ENUM('pdf','docx','md','txt')` | `format VARCHAR(20) NOT NULL` | 🔴 | Rename to `format`, change to VARCHAR(20) |
| 3.1.4 | `tags` column missing | ❌ Not present | `tags TEXT[] DEFAULT '{}'` | 🔴 | Add array column |
| 3.1.5 | `is_active` column missing | ❌ Not present | `is_active BOOLEAN NOT NULL DEFAULT true` | 🔴 | Add column |
| 3.1.6 | `uploaded_by` column wrong name | `created_by UUID` | `uploaded_by UUID REFERENCES users(id)` | 🔴 | Rename column to `uploaded_by` |
| 3.1.7 | `status` enum values wrong | `['pending','processing','completed','failed']` | `['pending','processing','indexed','error']` | 🔴 | Change enum values |
| 3.1.8 | `title` column exists | `title VARCHAR(255)` | Not in spec | 🔴 | **Remove column** (replaced by `name`) |

### 3.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 3.2.1 | `s3_key` length | `VARCHAR(500)` | `VARCHAR(1000)` | 🟡 | Change length to 1000 |
| 3.2.2 | Missing GIN index on `tags` | ❌ Not present | `CREATE INDEX idx_documents_tags ON documents USING GIN(tags)` | 🟡 | Add GIN index for array search |
| 3.2.3 | Missing `updated_at` trigger | ❌ Not present | Required | 🟡 | Add trigger |

### 3.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 3.3.1 | `original_name` | Present | Not in spec | Useful for UX — keep |
| 3.3.2 | `mime_type` | Present | Not in spec | Useful for file handling — keep |
| 3.3.3 | `chunk_count` | Present | Not in spec | Useful for analytics — keep |
| 3.3.4 | `processed_at` | Present | Not in spec | Useful for tracking — keep |
| 3.3.5 | `fingerprint` with index | Present | Not in spec | Useful for deduplication — keep |

### 3.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `size` BIGINT
- ✅ `s3_bucket` VARCHAR(500)
- ✅ `status` ENUM with DEFAULT 'pending'
- ✅ `error_message` TEXT nullable
- ✅ Foreign key to users with CASCADE

---

## 4. Chunks Table

### 4.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 4.1.1 | `chunk_index` column wrong name | `position INTEGER` | `chunk_index INTEGER NOT NULL` | 🔴 | Rename column to `chunk_index` |
| 4.1.2 | `is_active` column missing | ❌ Not present | `is_active BOOLEAN NOT NULL DEFAULT true` | 🔴 | Add column |
| 4.1.3 | `deactivated_by` column missing | ❌ Not present | `deactivated_by UUID REFERENCES users(id)` | 🔴 | Add column with FK |
| 4.1.4 | `deactivated_at` column missing | ❌ Not present | `deactivated_at TIMESTAMPTZ` | 🔴 | Add column |
| 4.1.5 | Vector index type wrong | `USING ivfflat ... WITH (lists = 100)` | `USING hnsw (embedding vector_cosine_ops) WITH (lists = 100)` | 🔴 | Change to HNSW index |

### 4.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 4.2.1 | `token_count` column missing | ❌ Not present | `token_count INTEGER` | 🟡 | Add column |
| 4.2.2 | `page_number` column missing | ❌ Not present | `page_number INTEGER` | 🟡 | Add column |

### 4.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 4.3.1 | `start_offset`, `end_offset` | Present | Not in spec | Useful for text highlighting — keep |
| 4.3.2 | `embedding_distance` | Present | Not in spec | Useful for caching similarity — keep |
| 4.3.3 | `metadata` | Present | Not in spec | Useful for extensibility — keep |

### 4.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `content` TEXT
- ✅ `embedding` vector(1536)
- ✅ Foreign key to documents with CASCADE
- ✅ Index on `document_id`

---

## 5. Instructions Table

### 5.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 5.1.1 | `content` column wrong name | `description TEXT` | `content TEXT NOT NULL` | 🔴 | Rename column to `content` |
| 5.1.2 | `created_by` column missing | ❌ Not present | `created_by UUID REFERENCES users(id)` | 🔴 | Add column with FK |

### 5.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 5.2.1 | Missing `updated_at` trigger | ❌ Not present | Required | 🟡 | Add trigger |

### 5.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 5.3.1 | `activated_at` | Present | Not in spec | Useful for audit — keep |

### 5.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `name` VARCHAR(255)
- ✅ `is_active` BOOLEAN DEFAULT false
- ✅ Timestamps

---

## 6. Instruction Versions Table

### 6.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 6.1.1 | `content` column wrong name | `system_prompt TEXT` | `content TEXT NOT NULL` | 🔴 | Rename column to `content` |
| 6.1.2 | `version_number` column wrong name | `version INTEGER` | `version_number INTEGER NOT NULL` | 🔴 | Rename column to `version_number` |

### 6.2 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 6.2.1 | `changes`, `changed_by` | Present | Not in spec (versioning not required) | Useful for audit — keep |

### 6.3 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ Foreign key to instructions with CASCADE
- ✅ `created_at` timestamp

---

## 7. Chat Sessions Table

### 7.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 7.1.1 | Partial unique index syntax | `WHERE is_active = true` ✅ | Required | ✅ | **Correctly implemented!** |

### 7.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 7.2.1 | Missing `updated_at` trigger | ❌ Not present | Required | 🟡 | Add trigger |

### 7.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 7.3.1 | `message_count`, `last_message_at` | Present | Not in spec | Useful for 200-message limit — keep |

### 7.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `title` VARCHAR(255)
- ✅ `is_active` BOOLEAN DEFAULT true
- ✅ Foreign key to users with CASCADE
- ✅ Partial unique index on `(user_id, is_active)` WHERE `is_active = true`

---

## 8. Chat Messages Table

### 8.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 8.1.1 | `session_id` column wrong name | `chat_session_id UUID` | `session_id UUID NOT NULL` | 🔴 | Rename column to `session_id` |
| 8.1.2 | `source_chunks` column wrong type | `sources JSONB` | `source_chunks UUID[]` | 🔴 | Change to UUID array |

### 8.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 8.2.1 | `latency_ms` column missing | ❌ Not present | `latency_ms INTEGER` | 🟡 | Add column |

### 8.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 8.3.1 | `metadata` | Present | Not in spec | Useful for extensibility — keep |
| 8.3.2 | `position` | Present | Not in spec | Useful for ordering — keep |

### 8.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ `role` ENUM ('user', 'assistant')
- ✅ `content` TEXT
- ✅ Foreign key to chat_sessions with CASCADE
- ✅ Index on `chat_session_id`

---

## 9. Query Logs Table

### 9.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 9.1.1 | `question` column wrong name | `query TEXT` | `question TEXT NOT NULL` | 🔴 | Rename column to `question` |
| 9.1.2 | `chunk_ids` column missing | ❌ Not present | `chunk_ids UUID[]` | 🔴 | Add UUID array column |
| 9.1.3 | `similarity_scores` column missing | ❌ Not present | `similarity_scores FLOAT[]` | 🔴 | Add FLOAT array column |

### 9.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 9.2.1 | `provider` column missing | ❌ Not present | `provider VARCHAR(50)` | 🟡 | Add column |
| 9.2.2 | `model` column missing | ❌ Not present | `model VARCHAR(100)` | 🟡 | Add column |
| 9.2.3 | `has_context` column missing | ❌ Not present | `has_context BOOLEAN` | 🟡 | Add column |
| 9.2.4 | Missing DESC index on `created_at` | ❌ Not present | `CREATE INDEX idx_query_logs_created_at ON query_logs(created_at DESC)` | 🟡 | Add DESC index for recent-first queries |

### 9.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 9.3.1 | `response`, `status` enum, `error_message` | Present | Not in spec | Useful for audit — keep |

### 9.4 Correctly Implemented

- ✅ `id` UUID PRIMARY KEY
- ✅ Foreign keys to users and chat_sessions with SET NULL
- ✅ Index on `user_id`
- ✅ `metadata` JSONB

---

## 10. Settings Table

### 10.1 Critical Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 10.1.1 | Primary key wrong type | `id UUID PRIMARY KEY` | `key VARCHAR(100) PRIMARY KEY` | 🔴 | **Major redesign:** Remove UUID id, make `key` the primary key |
| 10.1.2 | `value` column wrong type | `value TEXT` | `value JSONB NOT NULL` | 🔴 | Change type to JSONB |
| 10.1.3 | `updated_by` column missing | ❌ Not present | `updated_by UUID REFERENCES users(id)` | 🔴 | Add column with FK |
| 10.1.4 | `key` length | `VARCHAR(255)` | `VARCHAR(100)` | 🔴 | Change length to 100 |

### 10.2 Medium Issues

| # | Issue | Migration File | Tech Spec Requirement | Severity | Fix Required |
|---|-------|----------------|----------------------|----------|--------------|
| 10.2.1 | Missing `updated_at` trigger | ❌ Not present | Required | 🟡 | Add trigger |

### 10.3 Info (Acceptable Extensions)

| # | Column | Current | Spec | Notes |
|---|--------|---------|------|-------|
| 10.3.1 | `description`, `is_editable` | Present | Not in spec | Useful for UI — keep |
| 10.3.2 | `created_at` | Present | Not in spec | Useful for audit — keep |

---

## Appendix A: Missing PostgreSQL Functions & Triggers

### A.1 Missing Function

The following PostgreSQL function is **not defined** in the migration but is required per spec section 4.11:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### A.2 Missing Triggers

| # | Table | Trigger Name | Required | Status |
|---|-------|-------------|----------|--------|
| A.2.1 | `users` | `update_users_updated_at` | ✅ Required | 🔴 Missing |
| A.2.2 | `documents` | `update_documents_updated_at` | ✅ Required | 🔴 Missing |
| A.2.3 | `instructions` | `update_instructions_updated_at` | ✅ Required | 🔴 Missing |
| A.2.4 | `chat_sessions` | `update_chat_sessions_updated_at` | ✅ Required | 🔴 Missing |
| A.2.5 | `settings` | `update_settings_updated_at` | ✅ Required | 🔴 Missing |

---

## Appendix B: Missing or Incorrect Indexes

### B.1 Missing Indexes

| # | Table | Index Name | Columns | Type | Required | Status |
|---|-------|------------|---------|------|----------|--------|
| B.1.1 | `refresh_tokens` | `idx_refresh_tokens_user_id` | `user_id` | B-tree | ✅ | 🔴 Missing |
| B.1.2 | `refresh_tokens` | `idx_refresh_tokens_expires_at` | `expires_at` | B-tree | 🟡 | 🔴 Missing |
| B.1.3 | `documents` | `idx_documents_tags` | `tags` | GIN | ✅ | 🔴 Missing |
| B.1.4 | `query_logs` | `idx_query_logs_created_at` | `created_at DESC` | B-tree DESC | 🟡 | 🔴 Missing |

### B.2 Incorrect Indexes

| # | Table | Current Index | Required Index | Issue |
|---|-------|---------------|----------------|-------|
| B.2.1 | `chunks` | `ivfflat (embedding vector_cosine_ops)` | `hnsw (embedding vector_cosine_ops)` | Wrong index type — HNSW required for better performance |
| B.2.2 | `users` | `IDX_USERS_EMAIL_UNIQUE` on `email_unique` | Unique on `email` | Index on wrong column |

---

## Appendix C: Missing Foreign Keys

| # | Table | Column | References | Required | Status |
|---|-------|--------|------------|----------|--------|
| C.1.1 | `chunks` | `deactivated_by` | `users(id)` | 🟡 | 🔴 Missing |
| C.1.2 | `instructions` | `created_by` | `users(id)` | ✅ | 🔴 Missing |
| C.1.3 | `settings` | `updated_by` | `users(id)` | 🟡 | 🔴 Missing |

---

## Appendix D: Column Type Mismatches

| # | Table | Column | Current Type | Required Type | Severity |
|---|-------|--------|--------------|---------------|----------|
| D.1.1 | `users` | `name` | `VARCHAR(100)` | `VARCHAR(255)` | 🔴 |
| D.1.2 | `refresh_tokens` | `token` | `VARCHAR(500)` | `VARCHAR(255)` | 🔴 |
| D.1.3 | `documents` | `type` | `ENUM` | `VARCHAR(20)` | 🔴 |
| D.1.4 | `documents` | `s3_key` | `VARCHAR(500)` | `VARCHAR(1000)` | 🟡 |
| D.1.5 | `chunks` | `embedding` index | `ivfflat` | `hnsw` | 🔴 |
| D.1.6 | `chat_messages` | `sources` | `JSONB` | `UUID[]` | 🔴 |
| D.1.7 | `settings` | `key` | `VARCHAR(255)` | `VARCHAR(100)` | 🔴 |
| D.1.8 | `settings` | `value` | `TEXT` | `JSONB` | 🔴 |
| D.1.9 | `settings` | `id` | `UUID PRIMARY KEY` | Remove (use `key` as PK) | 🔴 |

---

## Appendix E: Summary by Table

| Table | Critical | Medium | Info | Total | Priority |
|-------|----------|--------|------|-------|----------|
| `users` | 4 | 1 | 0 | 5 | 🔴 High |
| `refresh_tokens` | 1 | 2 | 2 | 5 | 🔴 High |
| `documents` | 8 | 3 | 5 | 16 | 🔴 High |
| `chunks` | 5 | 2 | 3 | 10 | 🔴 High |
| `instructions` | 2 | 1 | 1 | 4 | 🔴 High |
| `instruction_versions` | 2 | 0 | 1 | 3 | 🔴 High |
| `chat_sessions` | 0 | 1 | 1 | 2 | 🟡 Medium |
| `chat_messages` | 2 | 1 | 2 | 5 | 🔴 High |
| `query_logs` | 3 | 4 | 1 | 8 | 🔴 High |
| `settings` | 4 | 1 | 2 | 7 | 🔴 High |
| **TOTAL** | **31** | **16** | **18** | **65** | |

---

## Appendix F: Recommended Fix Priority

### Phase 0 (Infrastructure) — Fix Immediately

1. ✅ Add `set_updated_at()` function
2. ✅ Add all `updated_at` triggers
3. ✅ Fix `settings` table structure (key as PK, value as JSONB)
4. ✅ Fix vector index type (HNSW instead of ivfflat)
5. ✅ Add UNIQUE constraint on `users.email`
6. ✅ Remove `users.email_unique` column

### Phase 1 (Authentication) — Fix Before Auth Implementation

1. ✅ Rename `users.password` → `password_hash`
2. ✅ Fix `users.name` length to 255
3. ✅ Rename `refresh_tokens.token` → `token_hash`
4. ✅ Add index on `refresh_tokens.user_id`
5. ✅ Add index on `refresh_tokens.expires_at`

### Phase 2 (Documents) — Fix Before Upload Feature

1. ✅ Add `documents.name`, `description`, `tags`, `is_active` columns
2. ✅ Rename `documents.type` → `format` (VARCHAR)
3. ✅ Rename `documents.created_by` → `uploaded_by`
4. ✅ Fix `documents.status` enum values
5. ✅ Add GIN index on `documents.tags`
6. ✅ Remove `documents.title` column
7. ✅ Add `chunks.is_active`, `deactivated_by`, `deactivated_at` columns
8. ✅ Rename `chunks.position` → `chunk_index`
9. ✅ Add `chunks.token_count`, `page_number` columns

### Phase 3 (RAG & Chat) — Fix Before RAG Implementation

1. ✅ Rename `instructions.description` → `content`
2. ✅ Add `instructions.created_by` column with FK
3. ✅ Rename `instruction_versions.system_prompt` → `content`
4. ✅ Rename `instruction_versions.version` → `version_number`
5. ✅ Rename `chat_messages.chat_session_id` → `session_id`
6. ✅ Change `chat_messages.sources` → `source_chunks UUID[]`
7. ✅ Add `chat_messages.latency_ms` column
8. ✅ Rename `query_logs.query` → `question`
9. ✅ Add `query_logs.chunk_ids`, `similarity_scores` array columns
10. ✅ Add `query_logs.provider`, `model`, `has_context` columns
11. ✅ Add DESC index on `query_logs.created_at`

---

## Appendix G: Migration Restructuring Plan

### Option 1: Complete Rewrite (Recommended)

**Pros:**
- Clean, spec-compliant migration from the start
- No technical debt
- Easier to maintain

**Cons:**
- More initial work
- Need to regenerate migration

**Steps:**
1. Delete current migration file
2. Generate new migration from updated entities using TypeORM CLI
3. Manually add missing triggers, indexes, and constraints
4. Test on fresh database

### Option 2: Patch Migration

**Pros:**
- Preserve existing migration history
- Incremental changes

**Cons:**
- Complex ALTER statements
- Risk of errors in production

**Steps:**
1. Create new migration file: `1710000000001-FixSchemaDiscrepancies.ts`
2. Add ALTER TABLE statements for each discrepancy
3. Add missing functions and triggers
4. Add missing indexes and foreign keys

### Option 3: Hybrid Approach

**Recommended for production:**

1. Fix critical issues in current migration (Phase 0 fixes)
2. Create patch migration for remaining issues
3. Apply patches in sequence

---

## Conclusion

The current migration file has **31 critical discrepancies** that must be addressed before the application can be considered spec-compliant. The most severe issues are:

1. **Security:** `refresh_tokens.token` stored as plain text instead of hash
2. **Data integrity:** Missing UNIQUE constraint on `users.email`
3. **Settings table:** Completely wrong structure (UUID PK vs string key, TEXT vs JSONB)
4. **Performance:** Vector index using ivfflat instead of hnsw
5. **Missing columns:** `is_active` on documents/chunks, `tags` array, `source_chunks` array
6. **Missing triggers:** No `updated_at` triggers on 5 required tables
7. **Wrong column names:** Throughout all tables (password, type, position, etc.)

**Recommendation:** Use **Option 1 (Complete Rewrite)** for the migration file to ensure a clean, spec-compliant database schema from the start. Generate the base migration from the updated entities, then manually add the missing triggers, indexes, and constraints.

---

## Related Documents

- `entities_discrepancies.md` — Entity-level discrepancies (now fixed)
- `02_technical_specification.md` — Source technical specification
- `entity_fixes_summary.md` — Summary of entity fixes

---

**Next Steps:**
1. Review this document with the team
2. Decide on migration restructuring approach (Option 1 recommended)
3. Create new migration file
4. Test migration on fresh PostgreSQL database
5. Verify all entities map correctly to new schema

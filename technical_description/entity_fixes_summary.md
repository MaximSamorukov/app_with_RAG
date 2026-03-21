# Entity Fixes Summary

**Date:** March 21, 2026  
**Status:** ✅ Complete  
**Build:** Passing

---

## Overview

All 10 TypeORM entity files have been updated to match the technical specification (`02_technical_specification.md`).

---

## Changes by Entity

### 1. ✅ User Entity (`User.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Password column | `password: string` | `passwordHash: string` with `@Column({ name: 'password_hash' })` |
| Email unique | No unique constraint | `unique: true` added |
| EmailUnique column | `emailUnique: string` (existed) | **Removed** |
| Name length | `length: 100` | `length: 255` |

---

### 2. ✅ RefreshToken Entity (`RefreshToken.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Token column | `token: string` | `tokenHash: string` with `@Column({ name: 'token_hash', length: 255 })` |
| ExpiresAt index | No index | `@Index()` added |

---

### 3. ✅ Document Entity (`Document.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Name column | ❌ Missing | `@Column({ type: 'varchar', length: 500 }) name: string` |
| Description column | ❌ Missing | `@Column({ type: 'text', nullable: true }) description: string \| null` |
| Type column | `type: DocumentType` (enum) | `format: string` with `@Column({ type: 'varchar', length: 20 })` |
| Tags column | ❌ Missing | `@Column({ type: 'text', array: true, default: () => "'{}'" }) tags: string[]` |
| IsActive column | ❌ Missing | `@Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean` |
| CreatedBy relation | `createdBy: User` | `uploadedBy: User` with `@JoinColumn({ name: 'uploaded_by' })` |
| CreatedById column | `createdById: string` | `uploadedById: string` |
| Status enum | `COMPLETED`, `FAILED` | `INDEXED`, `ERROR` |
| S3Key length | `length: 500` | `length: 1000` |
| Title column | `title: string` | **Removed** (replaced by `name`) |

---

### 4. ✅ Chunk Entity (`Chunk.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Position column | `position: number` | `chunkIndex: number` with `@Column({ name: 'chunk_index' })` |
| IsActive column | ❌ Missing | `@Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean` |
| DeactivatedBy column | ❌ Missing | `@Column({ name: 'deactivated_by', type: 'uuid', nullable: true }) deactivatedBy: string \| null` |
| DeactivatedAt column | ❌ Missing | `@Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true }) deactivatedAt: Date \| null` |
| TokenCount column | ❌ Missing | `@Column({ name: 'token_count', type: 'integer', nullable: true }) tokenCount: number \| null` |
| PageNumber column | ❌ Missing | `@Column({ name: 'page_number', type: 'integer', nullable: true }) pageNumber: number \| null` |
| Embedding index | `@Index({ synchronize: false })` | `@Index()` (synchronize managed by migration) |

---

### 5. ✅ Instruction Entity (`Instruction.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Description column | `description: string` | `content: string` (renamed) |
| CreatedBy column | ❌ Missing | `@Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string \| null` |
| CreatedBy relation | ❌ Missing | `@ManyToOne(() => User) createdByUser: User \| null` |

---

### 6. ✅ InstructionVersion Entity (`InstructionVersion.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| SystemPrompt column | `systemPrompt: string` | `content: string` with `@Column({ name: 'content' })` |
| Version column | `version: number` | `versionNumber: number` with `@Column({ name: 'version_number' })` |

---

### 7. ✅ ChatSession Entity (`ChatSession.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Message relation | `message.chatSession` | `message.session` (updated reference) |

*Note: Entity kept as-is per spec. The `@Unique(['user', 'isActive'])` decorator is acceptable; migration will use partial unique index.*

---

### 8. ✅ ChatMessage Entity (`ChatMessage.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| SessionId column | `chatSessionId: string` | `sessionId: string` with `@Column({ name: 'session_id' })` |
| Session relation | `chatSession: ChatSession` | `session: ChatSession` |
| Sources column | `sources: Record<string, unknown>[]` (jsonb) | `sourceChunks: string[]` with `@Column({ name: 'source_chunks', type: 'uuid', array: true })` |
| LatencyMs column | ❌ Missing | `@Column({ name: 'latency_ms', type: 'integer', nullable: true }) latencyMs: number \| null` |

---

### 9. ✅ QueryLog Entity (`QueryLog.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Question column | `query: string` | `question: string` with `@Column({ name: 'question' })` |
| ChunkIds column | ❌ Missing | `@Column({ name: 'chunk_ids', type: 'uuid', array: true, nullable: true }) chunkIds: string[] \| null` |
| SimilarityScores column | ❌ Missing | `@Column({ name: 'similarity_scores', type: 'float', array: true, nullable: true }) similarityScores: number[] \| null` |
| Provider column | ❌ Missing | `@Column({ type: 'varchar', length: 50, nullable: true }) provider: string \| null` |
| Model column | ❌ Missing | `@Column({ type: 'varchar', length: 100, nullable: true }) model: string \| null` |
| HasContext column | ❌ Missing | `@Column({ name: 'has_context', type: 'boolean', nullable: true }) hasContext: boolean \| null` |
| SessionId column | `chatSessionId: string` | `sessionId: string` with `@Column({ name: 'session_id' })` |
| Session relation | `chatSession: ChatSession` | `session: ChatSession` |

---

### 10. ✅ Setting Entity (`Setting.entity.ts`)

| Change | Before | After |
|--------|--------|-------|
| Primary key | `@PrimaryGeneratedColumn('uuid') id: string` | `@PrimaryColumn({ type: 'varchar', length: 100 }) key: string` |
| Value type | `@Column({ type: 'text' }) value: string` | `@Column({ name: 'value', type: 'jsonb' }) value: Record<string, unknown>` |
| UpdatedBy column | ❌ Missing | `@Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy: string \| null` |
| UpdatedBy relation | ❌ Missing | `@ManyToOne(() => User) updatedByUser: User \| null` |

---

## Exports Update (`entities/index.ts`)

| Change | Before | After |
|--------|--------|-------|
| Exports | `DocumentType` exported | **Removed** (no longer exists) |

---

## Remaining Work

### 🔴 Migration File Updates Required

The migration file (`server/api/src/database/migrations/1710000000000-InitialSchema.ts`) must be updated to:

1. **Add `updated_at` triggers** for: `users`, `documents`, `instructions`, `chat_sessions`, `settings`
2. **Create PostgreSQL function** `set_updated_at()`
3. **Fix vector index** on `chunks` table: use `hnsw` instead of `ivfflat`
4. **Add GIN index** on `documents.tags`
5. **Add DESC index** on `query_logs.created_at`
6. **Update column names** to match entities
7. **Add missing columns** that exist in entities
8. **Remove `users.email_unique`** column
9. **Add UNIQUE constraint** on `users.email`
10. **Fix `settings` table**: use `key` as primary key instead of UUID

### 🟡 Additional Database Features

- Partial unique index on `chat_sessions(user_id)` WHERE `is_active = true`
- Foreign key for `chunks.deactivated_by → users.id`
- Foreign key for `settings.updated_by → users.id`
- Foreign key for `instructions.created_by → users.id`

---

## Verification

```bash
# Build verification
npm run build

# Result: ✅ SUCCESS
```

All entity files compile without errors.

---

## Next Steps

1. ✅ **COMPLETE:** Update all entity files
2. 🔴 **TODO:** Create new migration file or patch existing migration
3. 🔴 **TODO:** Test migration on fresh database
4. 🔴 **TODO:** Update repository/service layer to use new property names
5. 🔴 **TODO:** Update API controllers to use new property names

---

## Related Files

- **Entities:** `server/api/src/database/entities/*.ts`
- **Migration:** `server/api/src/database/migrations/1710000000000-InitialSchema.ts`
- **Spec:** `technical_description/02_technical_specification.md`
- **Discrepancies:** `technical_description/entities_discrepancies.md`

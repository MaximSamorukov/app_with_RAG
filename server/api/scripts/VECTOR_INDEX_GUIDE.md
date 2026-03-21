# Vector Index Creation Guide

**Date:** March 21, 2026  
**Status:** Ready for Use

---

## 📋 Overview

The vector similarity search index is **not created automatically** during migrations. This is by design, as pgvector requires data in the table before creating the index to avoid the "column does not have dimensions" error.

This guide explains how to create the vector index after loading data into the `chunks` table.

---

## 🎯 When to Create the Index

Create the vector index **after**:
1. ✅ Migrations have been run
2. ✅ Documents have been uploaded and indexed
3. ✅ Chunks table has data with embeddings

**Do NOT create the index on an empty table!**

---

## 🔧 How to Create the Index

### Option 1: Using the SQL Script (Recommended)

```bash
# Navigate to project root
cd /home/maksim/projects/app_with_RAG

# Run the index creation script
docker exec -i rag_postgres psql -U postgres -d rag_assistant < server/api/scripts/create_vector_index.sql
```

### Option 2: Manual SQL Command

```bash
# Connect to PostgreSQL
docker exec -it rag_postgres psql -U postgres -d rag_assistant

# Create ivfflat index (compatible with all pgvector versions)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops);

# For pgvector >= 0.7.0, you can use hnsw for better performance:
# CREATE INDEX IF NOT EXISTS idx_chunks_embedding
# ON chunks USING hnsw (embedding vector_cosine_ops);
```

### Option 3: Using npm Script (Coming Soon)

```bash
cd server/api
npm run db:create-vector-index
```

---

## ✅ Verify Index Creation

### Check if Index Exists

```bash
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "\di idx_chunks_embedding"
```

**Expected output:**
```
                         List of relation
 Schema |         Name         | Type  |  Owner   | Table  
--------+----------------------+-------+----------+--------
 public | idx_chunks_embedding | index | postgres | chunks
(1 row)
```

### Check Index Size

```bash
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "SELECT pg_size_pretty(pg_relation_size('idx_chunks_embedding'));"
```

### Test Vector Search Performance

```sql
-- Test vector similarity search with timing
\timing on

-- Run a sample similarity search
SELECT c.id, c.content, 1 - (c.embedding <=> '<your-query-embedding>'::vector) AS similarity
FROM chunks c
WHERE 1 - (c.embedding <=> '<your-query-embedding>'::vector) > 0.75
ORDER BY similarity DESC
LIMIT 5;

-- Check execution time (should be < 100ms with index)
```

---

## 📊 Index Types Comparison

| Index Type | pgvector Version | Performance | Memory | Recommendation |
|------------|------------------|-------------|--------|----------------|
| **ivfflat** | All versions | Good | Low | ✅ Use for development |
| **hnsw** | >= 0.7.0 | Excellent | High | ✅ Use for production |

### ivfflat (Default)

```sql
CREATE INDEX idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops);
```

**Pros:**
- ✅ Compatible with all pgvector versions
- ✅ Lower memory usage
- ✅ Faster to create

**Cons:**
- ❌ Slower search than hnsw
- ❌ Requires `lists` parameter tuning for large datasets

### hnsw (Production, pgvector >= 0.7.0)

```sql
CREATE INDEX idx_chunks_embedding
ON chunks USING hnsw (embedding vector_cosine_ops);
```

**Pros:**
- ✅ Faster search performance
- ✅ Better for large datasets (>100k chunks)
- ✅ No parameter tuning required

**Cons:**
- ❌ Requires pgvector >= 0.7.0
- ❌ Higher memory usage
- ❌ Slower to create

---

## 🔧 Advanced Configuration

### Tuning ivfflat `lists` Parameter

For large datasets (>10k chunks), you can tune the `lists` parameter:

```sql
-- Drop existing index
DROP INDEX IF EXISTS idx_chunks_embedding;

-- Create with custom lists parameter
-- Rule of thumb: lists = chunks_count / 1000
CREATE INDEX idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Adjust based on your data size
```

**Recommended values:**
- < 10k chunks: `lists = 10`
- 10k-50k chunks: `lists = 50`
- 50k-100k chunks: `lists = 100`
- > 100k chunks: `lists = chunks_count / 1000`

### Analyzing Index Usage

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT c.id, c.content
FROM chunks c
WHERE 1 - (c.embedding <=> '<query-embedding>'::vector) > 0.75
ORDER BY similarity DESC
LIMIT 5;

-- Look for "Index Scan using idx_chunks_embedding" in the output
```

---

## 🐛 Troubleshooting

### Error: "column does not have dimensions"

**Cause:** Trying to create index on empty table or table without embeddings.

**Solution:**
1. Load data into the `chunks` table first
2. Ensure `embedding` column has vector data
3. Then create the index

```sql
-- Check if chunks table has data
SELECT COUNT(*) FROM chunks;

-- Check if embeddings exist
SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL;
```

### Error: "unrecognized parameter 'lists'"

**Cause:** Your pgvector version doesn't support the `lists` parameter.

**Solution:** Create index without the `WITH` clause:

```sql
CREATE INDEX idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops);
```

### Error: "could not access file '$libdir/vector'"

**Cause:** pgvector extension not installed or not loaded.

**Solution:**
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
\dx vector
```

---

## 📝 Maintenance

### Reindexing

Over time, the index may become less efficient. Reindex periodically:

```sql
-- Rebuild the index
REINDEX INDEX idx_chunks_embedding;

-- Or using CONCURRENTLY (doesn't lock table)
REINDEX INDEX CONCURRENTLY idx_chunks_embedding;
```

### Monitoring Index Size

```sql
-- Check index size
SELECT pg_size_pretty(pg_relation_size('idx_chunks_embedding'));

-- Check table size for comparison
SELECT pg_size_pretty(pg_relation_size('chunks'));
```

**Rule of thumb:** Index size should be ~10-20% of table size.

---

## 📚 Related Files

- `server/api/scripts/create_vector_index.sql` - Index creation script
- `server/api/src/database/migrations/1710000000000-InitialSchema.ts` - Main migration
- `technical_description/02_technical_specification.md` - Technical specification

---

## 🚀 Quick Reference

```bash
# 1. Run migrations
cd server/api && npx tsx scripts/run-migrations.ts

# 2. Load documents (via API)
# POST /api/v1/documents

# 3. Wait for indexing to complete
# Check document status: GET /api/v1/documents/:id

# 4. Create vector index
docker exec -i rag_postgres psql -U postgres -d rag_assistant < server/api/scripts/create_vector_index.sql

# 5. Verify index
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "\di idx_chunks_embedding"
```

---

**Last Updated:** March 21, 2026  
**Status:** Ready for Production Use

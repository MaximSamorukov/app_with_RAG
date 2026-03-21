-- ============================================
-- Vector Index Creation Script
-- ============================================
-- Run this script AFTER loading data into the chunks table
-- to create the vector similarity search index
--
-- Usage:
--   docker exec -i rag_postgres psql -U postgres -d rag_assistant < create_vector_index.sql
-- ============================================

-- Create ivfflat index for vector similarity search
-- This index type is compatible with all pgvector versions
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON chunks USING ivfflat (embedding vector_cosine_ops);

-- For production with pgvector >= 0.7.0, you can use hnsw for better performance:
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding
-- ON chunks USING hnsw (embedding vector_cosine_ops);

-- Verify index was created
\di idx_chunks_embedding

-- Show index size
SELECT pg_size_pretty(pg_relation_size('idx_chunks_embedding'));

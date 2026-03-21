import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // ==========================================
    // Create users table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: "'user'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_login_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'is_email_verified',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true
    );

    // ==========================================
    // Create refresh_tokens table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'token_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes on refresh_tokens
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKENS_USER_ID',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKENS_EXPIRES_AT',
        columnNames: ['expires_at'],
      })
    );

    // Create foreign key for refresh_tokens.user_id
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        name: 'FK_REFRESH_TOKENS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ==========================================
    // Create documents table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'documents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'format',
            type: 'varchar',
            length: '20',
          },
          {
            name: 's3_key',
            type: 'varchar',
            length: '1000',
          },
          {
            name: 'size_bytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            default: "'{}'",
            isArray: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'pending'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes on documents
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_TAGS',
        columnNames: ['tags'],
      })
    );

    // Create foreign key for documents.uploaded_by
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_USER',
        columnNames: ['uploaded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ==========================================
    // Create chunks table with pgvector
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'chunks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'document_id',
            type: 'uuid',
          },
          {
            name: 'chunk_index',
            type: 'integer',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'token_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'page_number',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'embedding',
            type: 'vector',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'deactivated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deactivated_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes on chunks
    await queryRunner.createIndex(
      'chunks',
      new TableIndex({
        name: 'IDX_CHUNKS_DOCUMENT_ID',
        columnNames: ['document_id'],
      })
    );

    // Note: Vector index creation is deferred until data is present in the table
    // To create the index manually after data is loaded, run:
    // CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops);
    // For pgvector >= 0.7.0, consider using hnsw for better performance:
    // CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

    // Create foreign key for chunks.document_id
    await queryRunner.createForeignKey(
      'chunks',
      new TableForeignKey({
        name: 'FK_CHUNKS_DOCUMENT',
        columnNames: ['document_id'],
        referencedTableName: 'documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create foreign key for chunks.deactivated_by
    await queryRunner.createForeignKey(
      'chunks',
      new TableForeignKey({
        name: 'FK_CHUNKS_DEACTIVATED_BY_USER',
        columnNames: ['deactivated_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ==========================================
    // Create instructions table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'instructions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create foreign key for instructions.created_by
    await queryRunner.createForeignKey(
      'instructions',
      new TableForeignKey({
        name: 'FK_INSTRUCTIONS_USER',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ==========================================
    // Create instruction_versions table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'instruction_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'instruction_id',
            type: 'uuid',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'version_number',
            type: 'integer',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create foreign key for instruction_versions.instruction_id
    await queryRunner.createForeignKey(
      'instruction_versions',
      new TableForeignKey({
        name: 'FK_INSTRUCTION_VERSIONS_INSTRUCTION',
        columnNames: ['instruction_id'],
        referencedTableName: 'instructions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ==========================================
    // Create chat_sessions table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'chat_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create index on chat_sessions.user_id
    await queryRunner.createIndex(
      'chat_sessions',
      new TableIndex({
        name: 'IDX_CHAT_SESSIONS_USER_ID',
        columnNames: ['user_id'],
      })
    );

    // Create unique index for single active session per user
    await queryRunner.createIndex(
      'chat_sessions',
      new TableIndex({
        name: 'IDX_CHAT_SESSIONS_ACTIVE_USER',
        columnNames: ['user_id'],
        isUnique: true,
        where: 'is_active = true',
      })
    );

    // Create foreign key for chat_sessions.user_id
    await queryRunner.createForeignKey(
      'chat_sessions',
      new TableForeignKey({
        name: 'FK_CHAT_SESSIONS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ==========================================
    // Create chat_messages table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'session_id',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'source_chunks',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'latency_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'message_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create index on chat_messages.session_id
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_CHAT_MESSAGES_SESSION_ID',
        columnNames: ['session_id'],
      })
    );

    // Create foreign key for chat_messages.session_id
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        name: 'FK_CHAT_MESSAGES_SESSION',
        columnNames: ['session_id'],
        referencedTableName: 'chat_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ==========================================
    // Create query_logs table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'query_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'question',
            type: 'text',
          },
          {
            name: 'chunk_ids',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'similarity_scores',
            type: 'float',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'has_context',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'latency_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create DESC index on query_logs.created_at
    await queryRunner.createIndex(
      'query_logs',
      new TableIndex({
        name: 'IDX_QUERY_LOGS_CREATED_AT',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createIndex(
      'query_logs',
      new TableIndex({
        name: 'IDX_QUERY_LOGS_USER_ID',
        columnNames: ['user_id'],
      })
    );

    // Create foreign keys for query_logs
    await queryRunner.createForeignKey(
      'query_logs',
      new TableForeignKey({
        name: 'FK_QUERY_LOGS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'query_logs',
      new TableForeignKey({
        name: 'FK_QUERY_LOGS_SESSION',
        columnNames: ['session_id'],
        referencedTableName: 'chat_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ==========================================
    // Create settings table
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'value',
            type: 'jsonb',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create foreign key for settings.updated_by
    await queryRunner.createForeignKey(
      'settings',
      new TableForeignKey({
        name: 'FK_SETTINGS_USER',
        columnNames: ['updated_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ==========================================
    // Create set_updated_at() function
    // ==========================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ==========================================
    // Create triggers for updated_at
    // ==========================================
    await queryRunner.query(`
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_documents_updated_at
        BEFORE UPDATE ON documents
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_instructions_updated_at
        BEFORE UPDATE ON instructions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_chat_sessions_updated_at
        BEFORE UPDATE ON chat_sessions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE ON settings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query('DROP TRIGGER IF EXISTS update_settings_updated_at ON settings');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_instructions_updated_at ON instructions');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_documents_updated_at ON documents');
    await queryRunner.query('DROP TRIGGER IF EXISTS update_users_updated_at ON users');

    // Drop set_updated_at function
    await queryRunner.query('DROP FUNCTION IF EXISTS set_updated_at()');

    // Drop foreign keys
    await queryRunner.dropForeignKey('settings', 'FK_SETTINGS_USER');
    await queryRunner.dropForeignKey('query_logs', 'FK_QUERY_LOGS_SESSION');
    await queryRunner.dropForeignKey('query_logs', 'FK_QUERY_LOGS_USER');
    await queryRunner.dropForeignKey('chat_messages', 'FK_CHAT_MESSAGES_SESSION');
    await queryRunner.dropForeignKey('chat_sessions', 'FK_CHAT_SESSIONS_USER');
    await queryRunner.dropForeignKey('instruction_versions', 'FK_INSTRUCTION_VERSIONS_INSTRUCTION');
    await queryRunner.dropForeignKey('instructions', 'FK_INSTRUCTIONS_USER');
    await queryRunner.dropForeignKey('chunks', 'FK_CHUNKS_DEACTIVATED_BY_USER');
    await queryRunner.dropForeignKey('chunks', 'FK_CHUNKS_DOCUMENT');
    await queryRunner.dropForeignKey('documents', 'FK_DOCUMENTS_USER');
    await queryRunner.dropForeignKey('refresh_tokens', 'FK_REFRESH_TOKENS_USER');

    // Drop tables in reverse order
    await queryRunner.dropTable('settings');
    await queryRunner.dropTable('query_logs');
    await queryRunner.dropTable('chat_messages');
    await queryRunner.dropTable('chat_sessions');
    await queryRunner.dropTable('instruction_versions');
    await queryRunner.dropTable('instructions');
    await queryRunner.dropTable('chunks');
    await queryRunner.dropTable('documents');
    await queryRunner.dropTable('refresh_tokens');
    await queryRunner.dropTable('users');

    // Drop pgvector extension
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}

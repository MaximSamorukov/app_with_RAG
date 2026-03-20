import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create users table
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
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'user'],
            default: "'user'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamptz',
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
          {
            name: 'email_unique',
            type: 'varchar',
            length: '255',
          },
        ],
      }),
      true
    );

    // Create index on users.email_unique
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_EMAIL_UNIQUE',
        columnNames: ['email_unique'],
        isUnique: true,
      })
    );

    // Create refresh_tokens table
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
            name: 'token',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
          },
          {
            name: 'revoked_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'revoked_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fingerprint',
            type: 'varchar',
            length: '45',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
        ],
      }),
      true
    );

    // Create index on refresh_tokens.fingerprint
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKENS_FINGERPRINT',
        columnNames: ['fingerprint'],
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

    // Create documents table
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
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'original_name',
            type: 'text',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['pdf', 'docx', 'md', 'txt'],
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '255',
          },
          {
            name: 's3_key',
            type: 'varchar',
            length: '500',
          },
          {
            name: 's3_bucket',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'chunk_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'processed_at',
            type: 'timestamptz',
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
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'fingerprint',
            type: 'varchar',
            length: '255',
            isNullable: true,
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
        name: 'IDX_DOCUMENTS_FINGERPRINT',
        columnNames: ['fingerprint'],
      })
    );

    // Create foreign key for documents.created_by
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_USER',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create chunks table with pgvector
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
            name: 'content',
            type: 'text',
          },
          {
            name: 'position',
            type: 'integer',
          },
          {
            name: 'start_offset',
            type: 'integer',
          },
          {
            name: 'end_offset',
            type: 'integer',
          },
          {
            name: 'embedding',
            type: 'vector',
            length: '1536',
          },
          {
            name: 'embedding_distance',
            type: 'float',
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
          {
            name: 'document_id',
            type: 'uuid',
          },
          {
            name: 'metadata',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create index on chunks.document_id
    await queryRunner.createIndex(
      'chunks',
      new TableIndex({
        name: 'IDX_CHUNKS_DOCUMENT',
        columnNames: ['document_id'],
      })
    );

    // Create HNSW index for vector similarity search (using ivfflat for compatibility)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
      ON chunks USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

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

    // Create instructions table
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
            name: 'description',
            type: 'text',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: false,
          },
          {
            name: 'activated_at',
            type: 'timestamptz',
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

    // Create instruction_versions table
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
            name: 'version',
            type: 'integer',
          },
          {
            name: 'system_prompt',
            type: 'text',
          },
          {
            name: 'changes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'changed_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'instruction_id',
            type: 'uuid',
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

    // Create chat_sessions table
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
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'message_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_message_at',
            type: 'timestamptz',
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
          {
            name: 'user_id',
            type: 'uuid',
          },
        ],
      }),
      true
    );

    // Create unique index on chat_sessions (user_id, is_active) for single active session
    await queryRunner.createIndex(
      'chat_sessions',
      new TableIndex({
        name: 'IDX_CHAT_SESSIONS_USER_ACTIVE',
        columnNames: ['user_id', 'is_active'],
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

    // Create chat_messages table
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
            name: 'role',
            type: 'enum',
            enum: ['user', 'assistant'],
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sources',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'position',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'chat_session_id',
            type: 'uuid',
          },
        ],
      }),
      true
    );

    // Create index on chat_messages.chat_session_id
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_CHAT_MESSAGES_SESSION',
        columnNames: ['chat_session_id'],
      })
    );

    // Create foreign key for chat_messages.chat_session_id
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        name: 'FK_CHAT_MESSAGES_SESSION',
        columnNames: ['chat_session_id'],
        referencedTableName: 'chat_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create query_logs table
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
            name: 'query',
            type: 'text',
          },
          {
            name: 'response',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'latency_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'error'],
            default: "'success'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'chat_session_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes on query_logs
    await queryRunner.createIndex(
      'query_logs',
      new TableIndex({
        name: 'IDX_QUERY_LOGS_USER',
        columnNames: ['user_id'],
      })
    );

    // Create settings table
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_editable',
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

    // Create unique index on settings.key
    await queryRunner.createIndex(
      'settings',
      new TableIndex({
        name: 'IDX_SETTINGS_KEY',
        columnNames: ['key'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop settings table
    await queryRunner.dropTable('settings');

    // Drop query_logs table
    await queryRunner.dropTable('query_logs');

    // Drop chat_messages table
    await queryRunner.dropTable('chat_messages');

    // Drop chat_sessions table
    await queryRunner.dropTable('chat_sessions');

    // Drop instruction_versions table
    await queryRunner.dropTable('instruction_versions');

    // Drop instructions table
    await queryRunner.dropTable('instructions');

    // Drop chunks table
    await queryRunner.dropTable('chunks');

    // Drop documents table
    await queryRunner.dropTable('documents');

    // Drop refresh_tokens table
    await queryRunner.dropTable('refresh_tokens');

    // Drop users table
    await queryRunner.dropTable('users');

    // Drop pgvector extension
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}

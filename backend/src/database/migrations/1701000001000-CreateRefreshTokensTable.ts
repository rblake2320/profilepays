import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRefreshTokensTable1701000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'is_revoked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key
    await queryRunner.createForeignKey('refresh_tokens', new TableForeignKey({
      columnNames: ['user_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'CASCADE',
    }));

    // Create indexes
    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'idx_refresh_tokens_token',
      columnNames: ['token'],
    }));

    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'idx_refresh_tokens_user_id',
      columnNames: ['user_id'],
    }));

    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'idx_refresh_tokens_expires_at',
      columnNames: ['expires_at'],
    }));

    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'idx_refresh_tokens_is_revoked',
      columnNames: ['is_revoked'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens');
  }
}
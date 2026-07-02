import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1701000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'user_role',
            type: 'enum',
            enum: ['member', 'advertiser', 'admin'],
            default: "'member'",
            isNullable: false,
          },
          {
            name: 'profile_image',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'email_verification_token',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email_verification_expires',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'password_reset_token',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'password_reset_expires',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex('users', new TableIndex({
      name: 'idx_users_email',
      columnNames: ['email'],
    }));

    await queryRunner.createIndex('users', new TableIndex({
      name: 'idx_users_user_role',
      columnNames: ['user_role'],
    }));

    await queryRunner.createIndex('users', new TableIndex({
      name: 'idx_users_is_active',
      columnNames: ['is_active'],
    }));

    await queryRunner.createIndex('users', new TableIndex({
      name: 'idx_users_created_at',
      columnNames: ['created_at'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
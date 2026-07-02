import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCampaignParticipationsTable1701000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaign_participations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'start_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'end_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'active', 'completed', 'cancelled', 'rejected', 'expired'],
            default: "'pending'",
          },
          {
            name: 'earnings_usd',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'completion_proof',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'approval_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'duration_actual_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'progress_percentage',
            type: 'integer',
            default: 0,
          },
          {
            name: 'milestones_completed',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'payment_processed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'payment_processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reminder_sent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reminder_sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'campaign_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint for user-campaign combination
    await queryRunner.createIndex(
      'campaign_participations',
      new TableIndex({
        name: 'UQ_user_campaign',
        columnNames: ['user_id', 'campaign_id'],
        isUnique: true,
      })
    );

    // Create other indexes
    await queryRunner.createIndex(
      'campaign_participations',
      new TableIndex({
        name: 'IDX_participation_status_created',
        columnNames: ['status', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'campaign_participations',
      new TableIndex({
        name: 'IDX_participation_user_status',
        columnNames: ['user_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'campaign_participations',
      new TableIndex({
        name: 'IDX_participation_campaign_status',
        columnNames: ['campaign_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'campaign_participations',
      new TableIndex({
        name: 'IDX_participation_times',
        columnNames: ['start_time', 'end_time'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'campaign_participations',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'campaign_participations',
      new TableForeignKey({
        columnNames: ['campaign_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'campaigns',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaign_participations');
  }
}
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCampaignsTable1701000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
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
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'brand_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'brand_logo',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'brand_color',
            type: 'varchar',
            length: '7',
            default: "'#000000'",
          },
          {
            name: 'payout_usd',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'enum',
            enum: [
              'social_media',
              'gaming',
              'shopping',
              'lifestyle',
              'finance',
              'health',
              'education',
              'entertainment',
              'technology',
              'travel',
              'other',
            ],
            default: "'other'",
          },
          {
            name: 'network',
            type: 'enum',
            enum: [
              'instagram',
              'tiktok',
              'youtube',
              'facebook',
              'twitter',
              'linkedin',
              'snapchat',
              'pinterest',
              'twitch',
              'discord',
            ],
            isNullable: true,
          },
          {
            name: 'featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            default: "'draft'",
          },
          {
            name: 'max_participants',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'current_participants',
            type: 'integer',
            default: 0,
          },
          {
            name: 'requirements',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'campaign_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'spent_budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'approval_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'advertiser_id',
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

    // Create indexes
    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_status_featured_created',
        columnNames: ['status', 'featured', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_category_status',
        columnNames: ['category', 'status'],
      })
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_network_status',
        columnNames: ['network', 'status'],
      })
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_payout_status',
        columnNames: ['payout_usd', 'status'],
      })
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_advertiser',
        columnNames: ['advertiser_id'],
      })
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'campaigns',
      new TableForeignKey({
        columnNames: ['advertiser_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaigns');
  }
}
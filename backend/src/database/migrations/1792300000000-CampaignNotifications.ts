import { MigrationInterface, QueryRunner } from 'typeorm';
export class CampaignNotifications1792300000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE placement_campaigns ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"broken":true,"completed":true}'::jsonb`
    );
  }
  async down() {
    throw new Error('Keep campaign notification preferences');
  }
}

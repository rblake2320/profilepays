import { MigrationInterface, QueryRunner } from 'typeorm';
export class AdvertiserCompany1792200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users ADD COLUMN company_name varchar(200)');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users DROP COLUMN company_name');
  }
}

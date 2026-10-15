import { MigrationInterface, QueryRunner } from 'typeorm';
export class UuidExtension1699999999000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }
  async down() {
    /* Shared extension is intentionally retained. */
  }
}

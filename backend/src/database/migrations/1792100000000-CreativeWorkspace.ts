import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreativeWorkspace1792100000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE placement_creatives (
      id uuid PRIMARY KEY, sponsor_id uuid NOT NULL REFERENCES users(id), name text NOT NULL,
      asset_key text NOT NULL, png_base64 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(sponsor_id,asset_key));
      CREATE TABLE placement_favorites (user_id uuid NOT NULL REFERENCES users(id),
      campaign_id uuid NOT NULL REFERENCES placement_campaigns(id), PRIMARY KEY(user_id,campaign_id));`);
  }
  async down() {
    throw new Error('Creative history must be retained');
  }
}

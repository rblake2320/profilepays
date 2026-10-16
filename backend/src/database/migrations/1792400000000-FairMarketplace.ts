import { MigrationInterface, QueryRunner } from 'typeorm';
export class FairMarketplace1792400000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE placement_campaigns ADD COLUMN max_breaches integer CHECK (max_breaches > 0);
      CREATE TABLE placement_holds (
        id uuid PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES placement_campaigns(id),
        user_id uuid NOT NULL REFERENCES users(id), destination_id uuid NOT NULL REFERENCES placement_destinations(id),
        command_key uuid NOT NULL, created_at_ms bigint NOT NULL, expires_at_ms bigint NOT NULL,
        state text NOT NULL CHECK(state IN ('held','confirmed','cancelled','expired')),
        UNIQUE(user_id,command_key));
      CREATE INDEX placement_hold_availability ON placement_holds(campaign_id,state,expires_at_ms);
      CREATE TABLE placement_breaches (
        placement_id uuid PRIMARY KEY REFERENCES placements(id), user_id uuid NOT NULL REFERENCES users(id),
        occurred_at_ms bigint NOT NULL, reason text NOT NULL,
        status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','overturned')));
      INSERT INTO placement_breaches(placement_id,user_id,occurred_at_ms,reason)
        SELECT id,user_id,(record->'notification'->>'occurredAt')::bigint,record->>'stopReason'
        FROM placements WHERE record->'notification'->>'type'='agreement_broken';
      CREATE TABLE participant_access (
        user_id uuid PRIMARY KEY REFERENCES users(id), banned boolean NOT NULL DEFAULT false,
        reason text NOT NULL, decided_by uuid NOT NULL REFERENCES users(id), decided_at_ms bigint NOT NULL);
      CREATE TABLE conduct_appeals (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
        placement_id uuid REFERENCES placement_breaches(placement_id), access_decision_ms bigint,
        reason text NOT NULL, created_at_ms bigint NOT NULL,
        status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','upheld','overturned')),
        decision_reason text, decided_by uuid REFERENCES users(id), decided_at_ms bigint);
      CREATE UNIQUE INDEX one_pending_breach_appeal ON conduct_appeals(placement_id) WHERE status='pending';
      CREATE UNIQUE INDEX one_pending_access_appeal ON conduct_appeals(user_id,access_decision_ms) WHERE status='pending';
      CREATE TABLE conduct_audit (id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id),
        user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL, reason text NOT NULL, at_ms bigint NOT NULL);
      CREATE TABLE advertiser_exclusions (
        sponsor_id uuid NOT NULL REFERENCES users(id), user_id uuid NOT NULL REFERENCES users(id),
        group_name text NOT NULL DEFAULT '', reason text NOT NULL, created_at_ms bigint NOT NULL,
        PRIMARY KEY(sponsor_id,user_id));
      CREATE TABLE verified_payees (
        user_id uuid PRIMARY KEY REFERENCES users(id), provider text NOT NULL, subject_digest text NOT NULL,
        status text NOT NULL CHECK(status IN ('verified','revoked')), verified_at_ms bigint NOT NULL,
        UNIQUE(provider,subject_digest));
      CREATE TABLE analytics_access (campaign_id uuid NOT NULL REFERENCES placement_campaigns(id),
        sponsor_id uuid NOT NULL REFERENCES users(id), package text NOT NULL CHECK(package IN ('demand','delivery','all')),
        enabled_at_ms bigint NOT NULL, mode text NOT NULL DEFAULT 'free_test_preview', PRIMARY KEY(campaign_id,package));
    `);
  }
  async down() {
    throw new Error('Retain agreement and conduct history');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
export class StaticPlacements1792000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
    CREATE TABLE placement_campaigns (
      id uuid PRIMARY KEY, sponsor_id uuid NOT NULL REFERENCES users(id), command_key uuid NOT NULL,
      terms jsonb NOT NULL, budget integer NOT NULL CHECK(budget>0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),
      spent integer NOT NULL DEFAULT 0 CHECK(spent>=0), status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sponsor_id,command_key), CHECK(reserved+spent<=budget)
    );
    CREATE TABLE placement_destinations (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), subject text NOT NULL UNIQUE,
      username text NOT NULL, encrypted_grant text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE placements (
      id uuid PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES placement_campaigns(id),
      user_id uuid NOT NULL REFERENCES users(id), destination_id uuid NOT NULL REFERENCES placement_destinations(id),
      command_key uuid NOT NULL, state text NOT NULL, record jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,command_key), UNIQUE(campaign_id,user_id)
    );
    CREATE UNIQUE INDEX placement_surface_lease ON placements(destination_id) WHERE state NOT IN ('ended','failed','cancelled');
    CREATE TABLE placement_observations (
      id bigserial PRIMARY KEY, placement_id uuid NOT NULL REFERENCES placements(id),
      at_ms bigint NOT NULL, kind text NOT NULL, evidence jsonb NOT NULL
    );
    CREATE TABLE placement_events (
      id bigserial PRIMARY KEY, placement_id uuid NOT NULL REFERENCES placements(id),
      at_ms bigint NOT NULL, type text NOT NULL, detail jsonb NOT NULL
    );
    CREATE TABLE test_credit_ledger (
      id bigserial PRIMARY KEY, placement_id uuid NOT NULL REFERENCES placements(id),
      account text NOT NULL, amount integer NOT NULL, currency text NOT NULL CHECK(currency='TEST_CREDIT'),
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(placement_id,account)
    );
  `);
  }
  async down() {
    throw new Error('Placement receipts must not be dropped automatically');
  }
}

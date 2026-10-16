import { MigrationInterface, QueryRunner } from 'typeorm';
export class RevocableSessions1792500000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE auth_sessions (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_hash text NOT NULL, revoked boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
    ); CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
    ALTER TABLE refresh_tokens ADD COLUMN session_id uuid REFERENCES auth_sessions(id) ON DELETE CASCADE;
    CREATE INDEX refresh_tokens_session ON refresh_tokens(session_id);
    UPDATE refresh_tokens SET is_revoked=true,revoked_at=now(),token='retired:'||id::text;`);
  }
  async down() {
    throw new Error('Session security migration cannot restore retired credentials');
  }
}

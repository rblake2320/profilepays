-- ProfilePays PostgreSQL Initialization Script
-- This runs once when the PostgreSQL container is first created.
-- TypeORM handles schema creation via synchronize:true (dev) or migrations (prod).

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the application user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'profilepays_user') THEN
    CREATE ROLE profilepays_user WITH LOGIN PASSWORD 'profilepays_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE profilepays_db TO profilepays_user;
GRANT ALL ON SCHEMA public TO profilepays_user;

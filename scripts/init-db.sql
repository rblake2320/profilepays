-- ProfilePays Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS text AS $$
BEGIN
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'ProfilePays database initialized successfully';
END $$;

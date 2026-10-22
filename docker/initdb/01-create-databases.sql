-- Runs once, on first container start, as the cluster superuser.
-- The local app role is deliberately separate from the maintenance superuser.
-- The password below is a local-development default, never a production secret.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tudolar_app') THEN
        CREATE ROLE tudolar_app
            LOGIN PASSWORD 'tudolar_app'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
    END IF;
END
$$;

CREATE DATABASE tudolar_test OWNER tudolar;

CREATE EXTENSION IF NOT EXISTS postgis;

\connect tudolar

GRANT CONNECT ON DATABASE tudolar TO tudolar_app;
REVOKE CREATE ON DATABASE tudolar FROM PUBLIC;
REVOKE CREATE ON DATABASE tudolar FROM tudolar_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO tudolar_app;
REVOKE CREATE ON SCHEMA public FROM tudolar_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tudolar_app;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM tudolar_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tudolar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tudolar IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tudolar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tudolar IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO tudolar_app;

\connect tudolar_test

CREATE EXTENSION IF NOT EXISTS postgis;

GRANT CONNECT ON DATABASE tudolar_test TO tudolar_app;
REVOKE CREATE ON DATABASE tudolar_test FROM PUBLIC;
REVOKE CREATE ON DATABASE tudolar_test FROM tudolar_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO tudolar_app;
REVOKE CREATE ON SCHEMA public FROM tudolar_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tudolar_app;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM tudolar_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tudolar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tudolar IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tudolar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tudolar IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO tudolar_app;

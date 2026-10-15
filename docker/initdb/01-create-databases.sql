-- Runs once, on first container start, as the cluster superuser.
-- The application role deliberately does not get these privileges in
-- shared or production environments; see README.md.

CREATE DATABASE tudolar_test OWNER tudolar;

CREATE EXTENSION IF NOT EXISTS postgis;

\connect tudolar_test

CREATE EXTENSION IF NOT EXISTS postgis;

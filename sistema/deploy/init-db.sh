#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$SGS_DB_PASSWORD" <<'SQL'
CREATE ROLE sgs LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE sgs OWNER TO sgs;
GRANT ALL ON SCHEMA public TO sgs;
SQL

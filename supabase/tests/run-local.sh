#!/usr/bin/env bash
# Applies every migration to a fresh LOCAL Postgres database and runs the
# security tests. Usage: PGHOST=/tmp PGPORT=5433 PGUSER=postgres supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-comedyradar_test}
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB"
$P -d "$DB" -f tests/local-stub.sql
for f in migrations/*.sql; do $P -d "$DB" -f "$f"; done
$P -d "$DB" -f tests/rls_test.sql 2>&1 | grep -E 'ok -|FAILED|ERROR'

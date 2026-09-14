#!/bin/sh
set -eu
umask 077
while true; do
    file="/backups/sgs-$(date -u +%Y%m%dT%H%M%SZ).dump"
    pg_dump --format=custom --no-owner --no-acl --file="$file.partial"
    pg_restore --list "$file.partial" >/dev/null
    mv "$file.partial" "$file"
    echo "Backup concluído: $file"
    sleep 86400
done

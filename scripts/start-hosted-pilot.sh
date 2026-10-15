#!/usr/bin/env bash
# Run on the selected Docker host from an extracted, built release checkout.
set -euo pipefail
cd "$(dirname "$0")/.."
test -n "${RELEASE_ID:?Set the committed release identifier}"
test -n "${PUBLIC_ORIGIN:?Set the public HTTPS origin}"
case "$PUBLIC_ORIGIN" in https://*) ;; *) echo 'HTTPS origin required' >&2; exit 1;; esac
deployment_root="$(cd ../.. && pwd)"
secret_file="$deployment_root/pilot.env"
if test ! -f "$secret_file"; then
  umask 077
  python3 - "$secret_file" <<'PY'
import secrets, sys
with open(sys.argv[1], 'x') as f:
    for key in ('DB_PASSWORD', 'JWT_SECRET', 'PLACEMENT_KEY'):
        f.write(key + '=' + secrets.token_hex(32) + '\n')
PY
fi
chmod 600 "$secret_file"
docker compose --env-file "$secret_file" -f docker-compose.pilot.yml up -d --no-build --wait --wait-timeout 120
curl --fail --silent http://127.0.0.1:8941/api/health
printf '\n'

#!/usr/bin/env bash
# Run on the GitHub Linux runner after the application archive passes Trivy.
# Pass the exact OCI archive produced by the existing Admin image job.
set -euo pipefail

archive=${1:?Pass the scanned Admin OCI archive path}
test -s "$archive"
command -v skopeo >/dev/null
command -v docker >/dev/null

image="oriso-admin-runtime-smoke:$$"
container="oriso-admin-runtime-smoke-$$"
cleanup() {
    status=$?
    if (( status != 0 )); then
        docker logs "$container" >&2 || true
    fi
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sha256sum "$archive"
skopeo --override-os linux --override-arch amd64 copy \
    "oci-archive:$archive" "docker-daemon:$image"
docker run --detach --pull=never --name "$container" --network none \
    --security-opt=no-new-privileges --cap-drop=ALL \
    --cap-add=CHOWN --cap-add=SETUID --cap-add=SETGID --cap-add=NET_BIND_SERVICE \
    -e VITE_API_URL=https://api.example.invalid "$image" >/dev/null

docker exec "$container" sh -ec '
    case "$(cat /etc/alpine-release)" in
        3.24.*) ;;
        *) echo "Unexpected Alpine release" >&2; exit 1 ;;
    esac
    cat /etc/alpine-release
    apk info -v nodejs
    nginx -v
    nginx -t
'
docker exec -i "$container" node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';

const get = (path) => fetch('http://127.0.0.1' + path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(1000),
});
assert.match(process.versions.node, /^24\./);

let shell;
const deadline = performance.now() + 15000;
while (performance.now() < deadline) {
    shell = await get('/admin').catch(() => null);
    if (shell?.ok) break;
    await shell?.body?.cancel();
    await pause(200);
}
assert.equal(shell?.status, 200, 'Helm readiness path');
assert.match(shell.headers.get('Content-Type') || '', /text\/html/);
assert.match(shell.headers.get('Cache-Control') || '', /\bno-cache\b/);
await shell.body?.cancel();

const env = await get('/admin/env.js');
assert.equal(env.status, 200, 'runtime configuration');
assert.match(env.headers.get('Cache-Control') || '', /\bno-store\b/);
assert.ok((await env.text()).includes('"API_URL": "https://api.example.invalid"'));

const session = await get('/admin/auth/session');
assert.equal(session.status, 401, 'normal cookie-free session response through nginx');
assert.equal(session.headers.has('Set-Cookie'), false);
await session.body?.cancel();
console.log('Admin readiness, runtime configuration and cookie-free auth BFF passed.');
JS

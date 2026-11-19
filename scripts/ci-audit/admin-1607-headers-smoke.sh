#!/usr/bin/env bash
set -euo pipefail

archive=${1:?Pass the scanned OCI image archive}
image="oriso-admin-headers:$$"
container="oriso-admin-headers-$$"
cleanup() {
    status=$?
    if (( status != 0 )); then
        docker logs "$container" >&2 || true
    fi
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

test -s "$archive"
skopeo --override-os linux --override-arch amd64 copy \
    "oci-archive:$archive" "docker-daemon:$image"
docker run --detach --pull=never --name "$container" --network none \
    --security-opt=no-new-privileges --cap-drop=ALL \
    --cap-add=CHOWN --cap-add=SETUID --cap-add=SETGID --cap-add=NET_BIND_SERVICE \
    -e VITE_API_URL=https://api.example.invalid "$image" >/dev/null
docker exec "$container" sh -ec '
    nginx -v
    nginx -t
    printf "synthetic root environment fixture\n" > /usr/share/nginx/html/env.js
    printf "synthetic font fixture\n" > /usr/share/nginx/html/admin/headers-audit.woff2
    printf "synthetic cache fixture\n" > /usr/share/nginx/html/admin/assets/headers-audit.js
'
docker exec -i "$container" node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';

const get = (path) => fetch('http://127.0.0.1' + path, {
    redirect: 'manual', signal: AbortSignal.timeout(1000),
});
const assertHeaders = (headers, path) => {
    assert.match(headers.get('content-security-policy') || '', /\bframe-ancestors 'self'(?:;|$)/, `${path} CSP`);
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN', `${path} XFO`);
    assert.equal(headers.get('x-content-type-options'), 'nosniff', `${path} MIME`);
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${path} referrer`);
};

let page;
const deadline = performance.now() + 15000;
while (performance.now() < deadline) {
    page = await get('/admin').catch(() => null);
    if (page?.ok) break;
    await page?.body?.cancel();
    await pause(200);
}
assert.equal(page?.status, 200, 'normal Admin route');
assertHeaders(page.headers, '/admin');
assert.match(page.headers.get('cache-control') || '', /\bno-cache\b/);
await page.body?.cancel();

for (const [path, status, extraHeader, expected] of [
    ['/env.js', 200, 'cache-control', /\bno-store\b/],
    ['/admin/env.js', 200, 'cache-control', /\bno-store\b/],
    ['/admin/assets/headers-audit.js', 200, 'cache-control', /\bimmutable\b/],
    ['/admin/headers-audit.woff2', 200, 'access-control-allow-origin', /^\*$/],
    ['/admin/auth/session', 401, '', null],
    ['/admin/assets/headers-audit-missing.js', 404, '', null],
]) {
    const result = await get(path);
    assert.equal(result.status, status, path);
    assertHeaders(result.headers, path);
    if (extraHeader) assert.match(result.headers.get(extraHeader) || '', expected, path);
    if (status === 404) assert.doesNotMatch(result.headers.get('cache-control') || '', /\bimmutable\b/);
    await result.body?.cancel();
}
console.log('Admin HTML, configuration, cache and font responses, auth status and asset errors passed.');
JS

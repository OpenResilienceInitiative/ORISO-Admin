#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

require_line() {
  grep -Fq -- "$2" "$1" || fail "$1 must contain $2"
}

line_number() {
  grep -nF -- "$2" "$1" | cut -d: -f1
}

workflow_dir=.github/workflows
action_dir=.github/actions/docker-build-push
action="$action_dir/action.yml"
release="$workflow_dir/release-image.yml"
call='uses: ./.github/actions/docker-build-push'
[[ "$(grep -Fc 'docker/build-push-action' "$action")" == 1 ]] ||
  fail 'The shared archive action must build once'
for filename in ci-main.yml ci-storybook-main.yml ci-pull-request.yml ci-storybook-pull-request.yml; do
  workflow="$workflow_dir/$filename"
  [[ "$(grep -Fc "$call" "$workflow")" == 1 ]] ||
    fail "$filename must use the shared archive gate once"
done
[[ "$(grep -Fc "$call" "$release")" == 2 &&
   "$(grep -Fc 'push_to_ghcr: false' "$release")" == 2 ]] ||
  fail 'Both versioned images must be scanned without publishing'
app_scan_line=$(line_number "$release" 'id: app_archive')
storybook_scan_line=$(line_number "$release" 'id: storybook_archive')
release_login_line=$(line_number "$release" 'docker/login-action')
app_publish_line=$(line_number "$release" 'name: Publish the scanned Admin image')
storybook_publish_line=$(line_number "$release" 'name: Publish the scanned Storybook image')
tag_line=$(line_number "$release" 'name: Create and push release tag')
release_line=$(line_number "$release" 'name: Create GitHub Release')
((app_scan_line < storybook_scan_line && storybook_scan_line < release_login_line &&
  release_login_line < app_publish_line && app_publish_line < storybook_publish_line &&
  storybook_publish_line < tag_line && tag_line < release_line)) ||
  fail 'Both scans must succeed before registry login and both uploads before tagging'
for archive_step in app_archive storybook_archive; do
  for output in archive archive_digest archive_sha256; do
    require_line "$release" "steps.${archive_step}.outputs.${output} }}"
  done
done
[[ "$(grep -Fc 'publish-image-archive.sh' "$release")" == 2 ]] ||
  fail 'The versioned images must be published from their scanned archives'
for filename in ci-main.yml ci-storybook-main.yml; do
  require_line "$workflow_dir/$filename" 'push_to_ghcr: true'
done
for filename in ci-pull-request.yml ci-storybook-pull-request.yml; do
  workflow="$workflow_dir/$filename"
  for setting in 'contents: read' 'persist-credentials: false' 'push_to_ghcr: false'; do
    require_line "$workflow" "$setting"
  done
  if grep -Eq 'packages: write|github_token:|push_to_ghcr: true|docker/login-action' "$workflow"; then
    fail "$filename must not have publishing operations or credentials"
  fi
done
for workflow in "$workflow_dir"/ci-main.yml "$workflow_dir"/ci-storybook-main.yml; do
  if grep -Eq 'docker/build-push-action|docker/login-action' "$workflow"; then
    fail "$workflow must use the shared archive gate for image operations"
  fi
done
require_line "$action" 'platforms: linux/amd64'
require_line "$action" 'push: false'
require_line "$action" 'outputs: type=oci,'
require_line "$action" 'EXPECTED_ARCHIVE_SHA256: ${{ steps.scan.outputs.archive_sha256 }}'
for step in 'Login to GitHub Container Registry' 'Publish the scanned archive without rebuilding'; do
  grep -A 3 -F -- "- name: $step" "$action" |
    grep -Fq "inputs.push_to_ghcr == 'true'" || fail "$step must be skipped in PRs"
done
scan_line=$(line_number "$action" 'scan-image-archive.sh')
login_line=$(line_number "$action" 'docker/login-action')
publish_line=$(line_number "$action" 'publish-image-archive.sh')
((scan_line < login_line && login_line < publish_line)) ||
  fail 'Scan must succeed before any registry operation'
printf '%s\n' 'Admin branch, release and no-push PR workflow contracts passed.'

scratch=$(mktemp -d "${TMPDIR:-/tmp}/admin-archive-test.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
export TEST_INDEX="$scratch/index.json" TEST_SCANS="$scratch/scans" TEST_UPLOAD="$scratch/upload"
export GITHUB_OUTPUT="$scratch/receipt" IMAGE_TAGS=example.invalid/admin:fixture
export TEST_FAIL_PLATFORM='' TEST_WRONG_ARCH='' TEST_WRONG_UPLOAD_DIGEST=''
archive="$scratch/image.tar"
platforms=linux/amd64
printf '%s' 'synthetic archive' > "$archive"
cat > "$TEST_INDEX" <<'JSON'
{"manifests": [
  {
    "platform": {"os": "linux", "architecture": "amd64"},
    "digest": "sha256:0000000000000000000000000000000000000000000000000000000000000001"
  },
  {
    "platform": {"os": "unknown", "architecture": "unknown"},
    "digest": "sha256:0000000000000000000000000000000000000000000000000000000000000003",
    "annotations": {"vnd.docker.reference.type": "attestation-manifest"}
  }
]}
JSON
checksum=$(sha256sum "$TEST_INDEX")
export TEST_INDEX_DIGEST="sha256:${checksum%% *}"

cat > "$scratch/skopeo" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  inspect)
    [[ "$2" == --raw && "$3" == oci-archive:* ]]
    cat "$TEST_INDEX"
    ;;
  manifest-digest)
    checksum=$(sha256sum "$2")
    printf 'sha256:%s\n' "${checksum%% *}"
    ;;
  --override-os)
    [[ "$2" == linux && "$3" == --override-arch && "$5" == copy &&
       "$6" == --preserve-digests && "$7" == --digestfile ]]
    case "$4" in amd64) number=1 ;; arm64) number=2 ;; *) exit 2 ;; esac
    if [[ "$4" == "$TEST_WRONG_ARCH" ]]; then number=2; fi
    printf 'sha256:%064d\n' "$number" > "$8"
    ;;
  copy)
    [[ "$2" == --all && "$3" == --preserve-digests && "$4" == --authfile &&
       "$6" == --digestfile && "$8" == oci-archive:* && "$9" == docker://example.invalid/* ]]
    printf '%s\n' "$9" >> "$TEST_UPLOAD"
    printf '%s\n' "${TEST_WRONG_UPLOAD_DIGEST:-$TEST_INDEX_DIGEST}" > "$7"
    ;;
  *) exit 2 ;;
esac
SH
cat > "$scratch/trivy" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == image && "$2" == --input && "$4" == --platform &&
   "${*:6}" == '--format table --exit-code 1 --ignore-unfixed --vuln-type os,library --severity CRITICAL,HIGH' ]]
printf '%s\n' "$5" >> "$TEST_SCANS"
[[ "$5" != "$TEST_FAIL_PLATFORM" ]]
SH
chmod 700 "$scratch/skopeo" "$scratch/trivy"
export PATH="$scratch:$PATH"

scan() {
  bash "$action_dir/scan-image-archive.sh" "$archive" "${1:-$platforms}" "$TEST_INDEX_DIGEST"
}

publish() {
  bash "$action_dir/publish-image-archive.sh" "$archive" "$TEST_INDEX_DIGEST" "$1"
}

scan
[[ "$(cat "$TEST_SCANS")" == linux/amd64 ]] || fail 'The native amd64 manifest must be scanned'
[[ ! -e "$TEST_UPLOAD" ]] || fail 'The scan must not upload to a registry'
receipt=$(sed -n 's/^archive_sha256=//p' "$GITHUB_OUTPUT")
publish "$receipt"
require_line "$GITHUB_OUTPUT" "digest=$TEST_INDEX_DIGEST"
require_line "$TEST_UPLOAD" "docker://$IMAGE_TAGS"

rm "$GITHUB_OUTPUT" "$TEST_UPLOAD"
if TEST_FAIL_PLATFORM=linux/amd64 scan > "$scratch/scan.log"; then fail 'A failed platform must stop the scan'; fi
[[ ! -e "$GITHUB_OUTPUT" && ! -e "$TEST_UPLOAD" ]] || fail 'A failed scan must produce no publish receipt or upload'

rm "$TEST_SCANS"
if TEST_WRONG_ARCH=amd64 scan > "$scratch/scan.log" 2>&1; then fail 'A mismatched platform must be rejected'; fi
require_line "$scratch/scan.log" 'The selected linux/amd64 manifest differs from the OCI index.'
[[ ! -e "$TEST_SCANS" && ! -e "$GITHUB_OUTPUT" ]] ||
  fail 'A mismatched manifest must not reach Trivy or produce a publish receipt'

if TEST_WRONG_UPLOAD_DIGEST=sha256:wrong publish "$receipt" 2> "$scratch/publish.log"; then
  fail 'A different uploaded digest must be rejected'
fi
require_line "$scratch/publish.log" 'Published image digest does not match the scanned build.'
[[ ! -e "$GITHUB_OUTPUT" ]] || fail 'A wrong uploaded digest must produce no successful publication receipt'
rm "$TEST_UPLOAD"
printf '%s' 'changed archive' > "$archive"
if publish "$receipt" 2> "$scratch/publish.log"; then fail 'A modified archive must not be published'; fi
require_line "$scratch/publish.log" 'The archive to publish differs from the scanned archive.'
[[ ! -e "$GITHUB_OUTPUT" && ! -e "$TEST_UPLOAD" ]] || fail 'A changed archive must be rejected before upload'

printf '%s\n' 'OCI archive scan and publication failure contracts passed.'

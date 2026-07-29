# Branded e-mail Storybook fixtures

`src/components/EmailPreview/fixtures/*.html` are **verbatim backend output**, not markup written
in this repository. ORISO-UserService#914 makes the backend the single owner of the mail layout
(`BrandedEmailLayoutRenderer` + `src/main/resources/email/layout/*`); the Admin renders the result
and nothing else. Hand-editing a fixture would recreate exactly the drift that issue removes.

Each fixture has a `.html` (the `html` field of a preview response) and a `.txt` (the `plainText`
alternative sent alongside it). `MANIFEST.txt` lists what each one is.

## Refresh against a running UserService (preferred)

The endpoint needs `AUTHORIZATION_TENANT_ADMIN`, `AUTHORIZATION_USER_ADMIN` or
`AUTHORIZATION_RESTRICTED_AGENCY_ADMIN`, i.e. the same token that reaches the other
`/useradmin/invite-email-templates` endpoints.

Run the whole set at once. Every fixture is a **pair** (`.html` + `.txt`) and `MANIFEST.txt` has to
agree with both, so the recipe stages everything in a temporary directory and only replaces the
checked-in files once every response has arrived and validated. A half-refreshed directory — new
HTML next to a stale text part, or a manifest describing files that no longer exist — is worse than
an untouched one.

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="$USERSERVICE/service/useradmin/invite-email-templates/preview"
OUT=src/components/EmailPreview/fixtures
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# One response -> both parts + one manifest line. `--fail` turns a 401/403/404 into a non-zero
# exit instead of writing an error body, and `jq -e` rejects a missing/empty/non-string field
# instead of writing the literal "null".
fetch() { # fetch <fixture-name> <query-string>
  curl -sS --fail -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 1" \
    "$BASE$2" > "$TMP/$1.json"
  jq -er '.html      | strings | select(length > 0)' "$TMP/$1.json" > "$TMP/$1.html"
  jq -er '.plainText | strings | select(length > 0)' "$TMP/$1.json" > "$TMP/$1.txt"
  printf '%s — subject: %s | acceptUrl: %s\n' "$1" \
    "$(jq -er '.subject         | strings | select(length > 0)' "$TMP/$1.json")" \
    "$(jq -er '.sampleAcceptUrl | strings | select(length > 0)' "$TMP/$1.json")" \
    >> "$TMP/manifest-body"
}

fetch invite-platform-de      "?language=de"
fetch invite-platform-en      "?language=en"
fetch invite-tenant-logo-de   "?tenant_id=7&language=de"
fetch invite-long-content-de  "?templateId=5"
fetch invite-short-content-de "?templateId=6"

# notification-no-cta-de has no endpoint equivalent (see below); carry the checked-in pair and its
# manifest line over unchanged so the manifest still describes the full directory.
cp "$OUT/notification-no-cta-de.html" "$OUT/notification-no-cta-de.txt" "$TMP/"
grep '^notification-no-cta-de ' "$OUT/MANIFEST.txt" >> "$TMP/manifest-body"

{ head -2 "$OUT/MANIFEST.txt"; echo; cat "$TMP/manifest-body"; } > "$TMP/MANIFEST.txt"

# Nothing above touched $OUT — everything is replaced together or not at all.
mv "$TMP"/*.html "$TMP"/*.txt "$TMP/MANIFEST.txt" "$OUT/"
```

Substitute ids that exist in the environment you query: `tenant_id` must be a tenant whose
`theming.logo` is an absolute `http(s)` URL (a base64 logo intentionally degrades to the
wordmark), `templateId=5`/`6` stand for a long and a very short stored template.

`notification-no-cta-de.html` has **no** query-parameter equivalent: the invite path always carries
an action, so the endpoint cannot render the button-less variant today. Regenerate it with the
offline generator below, or ask the UserService side for a flag on the endpoint and then curl it
like the rest.

## Offline generator (how the fixtures in this branch were made)

The preview endpoint was not deployed anywhere when these fixtures were first created, so they were
produced by driving the **same** `InviteEmailPreviewService` the controller calls, with only its
outer boundaries stubbed (template repository, TenantService branding lookup, SMTP settings).
`BrandedEmailFixtureGenerator.java` in this directory is that generator, kept here as the record of
how the files were produced.

```bash
US=<path to an ORISO-UserService checkout containing the #914 layout>
cp scripts/email-fixtures/BrandedEmailFixtureGenerator.java \
   "$US/src/test/java/de/caritas/cob/userservice/api/service/email/layout/"

cd "$US"
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw -o test-compile surefire:test \
  -Dtest=BrandedEmailFixtureGenerator -Dsurefire.failIfNoSpecifiedTests=false \
  -Doriso.email.fixtures.out=<path to ORISO-Admin>/src/components/EmailPreview/fixtures

# leave the UserService checkout as you found it
rm src/test/java/de/caritas/cob/userservice/api/service/email/layout/BrandedEmailFixtureGenerator.java
```

The generator writes `MANIFEST.txt` alongside the fixtures. It is deliberately **not** part of the
UserService test suite: it asserts nothing, it only writes files.

It has no palette of its own, and must not grow one. Since the colour fix on ORISO-UserService#914
the mail accent resolves as `theming.primaryColor` → `EmailColors.PLATFORM_ACCENT_DARK` (`#a5000a`)
and the neutrals are literals in `email/layout/*.html` taken from this repo's `src/app.css`; the
SMTP setting `globalSmtpEmailThemeColor` is deliberately not read. The checked-in fixtures were last
regenerated against that backend state — a fixture still showing the old navy `#0f3b8f` accent or a
grey `#111827`/`#374151` ramp is stale and must be regenerated, never recoloured here.

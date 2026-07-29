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

```bash
BASE="$USERSERVICE/service/useradmin/invite-email-templates/preview"
OUT=src/components/EmailPreview/fixtures
GET() { curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 1" "$1"; }

GET "$BASE?language=de"                | jq -r .html      > $OUT/invite-platform-de.html
GET "$BASE?language=de"                | jq -r .plainText > $OUT/invite-platform-de.txt
GET "$BASE?language=en"                | jq -r .html      > $OUT/invite-platform-en.html
GET "$BASE?tenant_id=7&language=de"    | jq -r .html      > $OUT/invite-tenant-logo-de.html
GET "$BASE?templateId=5"               | jq -r .html      > $OUT/invite-long-content-de.html
GET "$BASE?templateId=6"               | jq -r .html      > $OUT/invite-short-content-de.html
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

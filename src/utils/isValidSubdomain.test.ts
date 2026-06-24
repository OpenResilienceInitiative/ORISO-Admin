/* eslint-disable no-console */
/**
 * Pure-logic test for isValidSubdomain.
 *
 * NOTE: this repo has no jest and Cypress e2e cannot run bare. This file is a
 * self-contained, runnable assertion harness:
 *     npx ts-node --transpile-only --compiler-options '{"module":"commonjs"}' src/utils/isValidSubdomain.test.ts
 * It does NOT run in CI (CI only does `CI=false npm run build`).
 */
import { isValidSubdomain, SUBDOMAIN_PATTERN } from './isValidSubdomain';

let failures = 0;
const assert = (label: string, actual: unknown, expected: unknown) => {
    const ok = actual === expected;
    if (!ok) {
        failures += 1;
        console.error(`  FAIL: ${label} -> got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    } else {
        console.log(`  ok: ${label}`);
    }
};

console.log('isValidSubdomain');

// valid cases
['caritas', 'caritas-online', 'a', 'tenant1', 'a1b2-c3', '123', 'x-y-z'].forEach((v) =>
    assert(`valid "${v}"`, isValidSubdomain(v), true),
);

// empty/nullish are considered "valid" here (required is a separate rule)
assert('empty string', isValidSubdomain(''), true);
assert('undefined', isValidSubdomain(undefined), true);
assert('null', isValidSubdomain(null), true);

// invalid cases
[
    'Caritas', // uppercase
    '-caritas', // leading hyphen
    'caritas-', // trailing hyphen
    'cari tas', // space
    'cari_tas', // underscore
    'cari.tas', // dot
    'cäritas', // non-ascii
    'café', // accent
].forEach((v) => assert(`invalid "${v}"`, isValidSubdomain(v), false));

// the exported pattern is the same one used by the form rule
assert('pattern matches valid', SUBDOMAIN_PATTERN.test('caritas-online'), true);
assert('pattern rejects invalid', SUBDOMAIN_PATTERN.test('-bad-'), false);

if (failures > 0) {
    console.error(`\nisValidSubdomain: ${failures} assertion(s) FAILED`);
    process.exit(1);
} else {
    console.log('\nisValidSubdomain: ALL PASSED');
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('user assignment fields', () => {
    it('renders tenant and agency assignment only once when consultant topics are enabled', () => {
        expect(source.match(/name="tenantId"/g)).toHaveLength(1);
        expect(source.match(/name="agencies"/g)).toHaveLength(1);
        expect(source.match(/name="topicIds"/g)).toHaveLength(1);
    });
});

describe('user save error reporting', () => {
    it('delegates X-Reason mapping to the extracted resolver instead of an inline switch', () => {
        // The mapping itself is asserted in utils/userSaveErrorMessageKey.test.ts. This only pins
        // the page to one call site, so a reason cannot be handled in two places that disagree.
        expect(source).toContain('resolveUserSaveErrorMessageKey(error.headers.get(FETCH_ERRORS.X_REASON)');
        expect(source).not.toContain('switch (error.headers.get(FETCH_ERRORS.X_REASON))');
    });
});

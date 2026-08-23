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

describe('consultant creation error reporting', () => {
    it('names an unconfigured tenant licence instead of falling through to the generic error', () => {
        expect(source).toContain('X_REASON.TENANT_LICENSING_NOT_CONFIGURED');
        expect(source).toContain("t('message.error.TENANT_LICENSING_NOT_CONFIGURED')");
    });

    it('carries that message in every shipped locale', () => {
        ['en', 'de'].forEach((locale) => {
            const translations = JSON.parse(
                readFileSync(resolve(__dirname, `../../../locales/${locale}/translation.json`), 'utf8'),
            );
            expect(translations['message.error.TENANT_LICENSING_NOT_CONFIGURED']).toBeTruthy();
        });
    });
});

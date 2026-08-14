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

describe('consultant form validation (#717)', () => {
    it('jumps to the first invalid field instead of dropping the save on the floor', () => {
        expect(source).toContain('onFinishFailed');
        expect(source).toContain('focusFirstInvalidField');
        expect(source).toMatch(/name=\{FORM_NAME\}/);
        expect(source).toContain('preserve');
    });
});

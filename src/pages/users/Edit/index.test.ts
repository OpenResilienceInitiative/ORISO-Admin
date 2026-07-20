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

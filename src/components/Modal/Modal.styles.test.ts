import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const scaled = 'calc(0.875rem * var(--admin-personal-text-scale, 1))';

const slice = (from: string, to: string) => styles.slice(styles.indexOf(from), styles.indexOf(to));

describe('dialog copy follows the personal text size', () => {
    it('scales the body and the cancel action, and lets the button grow', () => {
        const body = slice('.ant-modal-body {', '.ant-modal-footer');
        const action = slice('.actionButton {', '.actionButtonPrimary');

        expect(body).toContain(`font-size: ${scaled}`);
        expect(body).toContain('line-height: calc(1.25rem * var(--admin-personal-text-scale, 1))');
        expect(action).toContain(`font-size: ${scaled}`);
        expect(action).toContain('line-height: calc(1.25rem * var(--admin-personal-text-scale, 1))');
        expect(action).toContain('min-height: 40px');
        expect(action).not.toMatch(/\n\s*height:\s*40px;/);
    });
});

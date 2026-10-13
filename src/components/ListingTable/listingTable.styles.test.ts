import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/*
 * ORISO-Admin#1127 — on a phone the table dropped its radius to 0 while antd's
 * header cells kept their own 16px, so a table inside a dialog showed a round
 * top-left corner over square top-right and bottom corners.
 */
describe('ListingTable corner contract (#1127)', () => {
    it('drives the header cells corners from the same variable as the table', () => {
        expect(source).toMatch(/th:first-child\s*\{[^{}]*border-start-start-radius:\s*var\(--admin-table-radius\)/);
        expect(source).toMatch(/th:last-child\s*\{[^{}]*border-start-end-radius:\s*var\(--admin-table-radius\)/);
    });

    it('keeps the card radius on phones when the table sits inside a dialog', () => {
        const phone = source.match(/@media \(max-width: 768px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';
        expect(phone).toMatch(/--admin-table-radius:\s*0/);
        expect(phone).toMatch(/:global\(\.ant-modal\)\s+\.listingTable\s*\{[^{}]*--admin-table-radius:\s*16px/);
    });
});

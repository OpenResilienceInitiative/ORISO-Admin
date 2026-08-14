import { describe, expect, it } from 'vitest';
import { createMockDpiaTextGateway } from './dpiaTextGateway';

const TENANT = 1;

describe('createMockDpiaTextGateway', () => {
    it('starts from the seeded document', async () => {
        const gateway = createMockDpiaTextGateway({
            texts: { governance: '<p>seeded</p>' },
            statusBySection: { governance: 'PUBLISHED' },
        });

        await expect(gateway.load(TENANT)).resolves.toEqual({
            texts: { governance: '<p>seeded</p>' },
            statusBySection: { governance: 'PUBLISHED' },
        });
    });

    it('merges saved texts into the stored document instead of replacing it', async () => {
        const gateway = createMockDpiaTextGateway({ texts: { governance: '<p>a</p>' } });

        await gateway.save(TENANT, { escalationChain: '<p>b</p>' }, false);

        const { texts } = await gateway.load(TENANT);
        expect(texts).toEqual({ governance: '<p>a</p>', escalationChain: '<p>b</p>' });
    });

    it('a draft save leaves the publication status untouched', async () => {
        const gateway = createMockDpiaTextGateway();

        await gateway.save(TENANT, { governance: '<p>draft</p>' }, false);

        const { statusBySection } = await gateway.load(TENANT);
        expect(statusBySection.governance).toBeUndefined();
    });

    it('a draft save on a previously published section demotes it back to draft', async () => {
        const gateway = createMockDpiaTextGateway({ statusBySection: { governance: 'PUBLISHED' } });

        await gateway.save(TENANT, { governance: '<p>edited after publish</p>' }, false);

        const { statusBySection } = await gateway.load(TENANT);
        // A missing entry means DRAFT — the editor must not keep showing a Published badge over
        // content that has since been overwritten by an unpublished draft save.
        expect(statusBySection.governance).toBeUndefined();
    });

    it('publishing marks only the sections that actually carry text', async () => {
        const gateway = createMockDpiaTextGateway();

        await gateway.save(
            TENANT,
            {
                governance: '<p>written</p>',
                annexIndex: '<p></p>',
                resultParagraph: '  ',
                accountability: '<p><br></p>',
            },
            true,
        );

        const { statusBySection } = await gateway.load(TENANT);
        expect(statusBySection.governance).toBe('PUBLISHED');
        // An empty TipTap document, whitespace, and TipTap's other empty shape are all
        // "not written yet", not published.
        expect(statusBySection.annexIndex).toBeUndefined();
        expect(statusBySection.resultParagraph).toBeUndefined();
        expect(statusBySection.accountability).toBeUndefined();
    });

    it('keeps documents separate per tenant', async () => {
        const gateway = createMockDpiaTextGateway();

        await gateway.save(1, { governance: '<p>tenant one</p>' }, true);

        await expect(gateway.load(2)).resolves.toEqual({ texts: {}, statusBySection: {} });
    });
});

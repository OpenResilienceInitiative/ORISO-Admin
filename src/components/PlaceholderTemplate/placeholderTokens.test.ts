import { describe, expect, it } from 'vitest';
import {
    fillPlaceholders,
    insertPlaceholder,
    INVITE_EMAIL_TOKENS,
    inviteEmailTokensForKind,
    LEGAL_CONSENT_TOKENS,
    listPlaceholders,
    sampleValues,
} from './placeholderTokens';

describe('fillPlaceholders', () => {
    it('substitutes known {{key}} tokens', () => {
        expect(fillPlaceholders('Hallo {{firstName}} {{lastName}}!', { firstName: 'Lisa', lastName: 'Beispiel' })).toBe(
            'Hallo Lisa Beispiel!',
        );
    });

    it('tolerates whitespace inside the braces', () => {
        expect(fillPlaceholders('Hallo {{ firstName }}!', { firstName: 'Lisa' })).toBe('Hallo Lisa!');
    });

    it('leaves unknown tokens visible instead of blanking them', () => {
        expect(fillPlaceholders('Hallo {{firstName}}, dein {{unbekannt}}.', { firstName: 'Lisa' })).toBe(
            'Hallo Lisa, dein {{unbekannt}}.',
        );
    });

    it('substitutes dotted keys', () => {
        expect(fillPlaceholders('{{tenant.name}}', { 'tenant.name': 'Caritas' })).toBe('Caritas');
    });

    it('replaces an empty-string value with the empty string, not the token', () => {
        expect(fillPlaceholders('x{{a}}y', { a: '' })).toBe('xy');
    });
});

describe('listPlaceholders', () => {
    it('lists every distinct token once, whitespace-normalised', () => {
        expect(listPlaceholders('{{a}} und {{ b }} und {{a}}')).toEqual(['{{a}}', '{{b}}']);
    });

    it('returns an empty list for token-free text', () => {
        expect(listPlaceholders('kein Platzhalter')).toEqual([]);
    });
});

describe('insertPlaceholder', () => {
    it('inserts {{key}} at the caret and reports the new caret position', () => {
        expect(insertPlaceholder('Hallo !', 6, 6, 'firstName')).toEqual({
            value: 'Hallo {{firstName}}!',
            cursor: 6 + '{{firstName}}'.length,
        });
    });

    it('replaces a selected range', () => {
        expect(insertPlaceholder('Hallo NAME!', 6, 10, 'firstName')).toEqual({
            value: 'Hallo {{firstName}}!',
            cursor: 6 + '{{firstName}}'.length,
        });
    });

    it('appends when the caret sits at the end', () => {
        expect(insertPlaceholder('Link: ', 6, 6, 'inviteLink')).toEqual({
            value: 'Link: {{inviteLink}}',
            cursor: 'Link: {{inviteLink}}'.length,
        });
    });
});

describe('token presets', () => {
    // The branded layout renders the invite link itself, as a button plus a
    // visible copy-paste line. Offering the author an {{inviteLink}} token to
    // paste into the body could only ever produce the same URL twice in the
    // received mail — so the picker does not offer it. UserService strips a
    // token left over in an older stored body (AccountInviteService.renderBody).
    it('does not offer the action link as an insertable token', () => {
        expect(INVITE_EMAIL_TOKENS.map((token) => token.key)).not.toContain('inviteLink');
    });

    it('invite tokens match the UserService AccountInviteService placeholder set', () => {
        expect(INVITE_EMAIL_TOKENS.map((token) => token.key)).toEqual(['email', 'firstName', 'lastName', 'tenantId']);
    });

    // D4 — Frank's sample identity. The mail preview itself is rendered by the
    // backend, which carries the same names (InviteEmailPreviewService); these
    // samples keep the picker's own hints consistent with it.
    it('uses the Maren Muster sample identity', () => {
        const samples = sampleValues(INVITE_EMAIL_TOKENS);
        expect(samples.firstName).toBe('Maren');
        expect(samples.lastName).toBe('Muster');
        expect(samples.email).toBe('maren.muster@example.org');
    });

    it('legal consent tokens cover the registration consent sentence', () => {
        expect(LEGAL_CONSENT_TOKENS.map((token) => token.key)).toEqual(['Beratungsstelle', 'Thema', 'legal_links']);
    });

    /*
     * #746: every InviteEmailTemplateKind carries the key set the UserService
     * substitutes — one shared map today, and the per-kind seam Admin#723 (DPA
     * forward) extends later.
     *
     * `inviteLink` is NOT in it, and that is not a drift from the backend: the
     * branded layout renders the action link itself, so `renderBody` strips the
     * token before substitution. What the picker offers is what an author may
     * insert, and inserting the link could only ever duplicate it.
     */
    it.each(['TENANT_INVITE', 'COUNSELLOR_INVITE', 'DPA_FORWARD'] as const)(
        'tokens for %s match the AccountInviteService placeholder set',
        (kind) => {
            expect(inviteEmailTokensForKind(kind).map((token) => token.key)).toEqual([
                'email',
                'firstName',
                'lastName',
                'tenantId',
            ]);
        },
    );

    it.each(['TENANT_INVITE', 'COUNSELLOR_INVITE', 'DPA_FORWARD'] as const)(
        'never offers the action link for %s, whatever the kind',
        (kind) => {
            expect(inviteEmailTokensForKind(kind).map((token) => token.key)).not.toContain('inviteLink');
        },
    );

    it('sampleValues builds a key->sample map every token can be previewed with', () => {
        const samples = sampleValues(INVITE_EMAIL_TOKENS);
        expect(Object.keys(samples)).toEqual(['email', 'firstName', 'lastName', 'tenantId']);
        INVITE_EMAIL_TOKENS.forEach((token) => {
            expect(samples[token.key]).toBe(token.sample);
            expect(token.sample.length).toBeGreaterThan(0);
        });
    });
});

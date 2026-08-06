import { beforeEach, describe, expect, it } from 'vitest';
import { deferTwoFactorSetup, isTwoFactorSetupDeferred } from './twoFactorSetupDeferral';

describe('two-factor setup deferral', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('reports no deferral before the admin skips', () => {
        expect(isTwoFactorSetupDeferred('chucknorris')).toBe(false);
    });

    it('remembers that the admin chose to set 2FA up later', () => {
        deferTwoFactorSetup('chucknorris');

        expect(isTwoFactorSetupDeferred('chucknorris')).toBe(true);
    });

    it('does not carry one admin deferral over to another account', () => {
        deferTwoFactorSetup('chucknorris');

        expect(isTwoFactorSetupDeferred('someone-else')).toBe(false);
    });

    it('ignores a missing username instead of deferring for everyone', () => {
        deferTwoFactorSetup(undefined);

        expect(sessionStorage.length).toBe(0);
        expect(isTwoFactorSetupDeferred(undefined)).toBe(false);
    });

    it('re-prompts once the session storage is cleared, as logout does', () => {
        deferTwoFactorSetup('chucknorris');
        sessionStorage.clear();

        expect(isTwoFactorSetupDeferred('chucknorris')).toBe(false);
    });
});

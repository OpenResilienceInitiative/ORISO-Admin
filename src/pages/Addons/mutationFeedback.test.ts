import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vite-plus/test';
import { reportAddonSaveError } from './mutationFeedback';

const t = ((key: string) => key) as unknown as TFunction;

const report = (error: unknown) => {
    const show = { error: vi.fn() };
    reportAddonSaveError(error, t, show);
    return show.error;
};

describe('reportAddonSaveError', () => {
    it('says that a refused change was not saved', () => {
        expect(report(new Error('FORBIDDEN'))).toHaveBeenCalledWith('addons.error.saveForbidden');
    });

    it.each([new Error('NO_MATCH'), new TypeError('Failed to fetch'), new Error('UNAUTHORIZED')])(
        'reports other failures as not saved (%s)',
        (error) => {
            expect(report(error)).toHaveBeenCalledWith('addons.error.save');
        },
    );

    it('stays silent when the transport already showed its message', () => {
        expect(report(new Error('CATCH_ALL'))).not.toHaveBeenCalled();
    });
});

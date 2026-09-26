import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { SelfAssignments } from '../../api/accountInvites/selfAssignments';
import { SelfAssignDialog } from './SelfAssignDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown, options: Record<string, unknown> = {}) =>
            typeof fallback === 'string'
                ? fallback.replace(/{{(\w+)}}/g, (_, name: string) => String(options[name] ?? ''))
                : key,
    }),
}));

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

const AGENCY = { id: 12, name: 'Beratungsstelle Springfield Mitte' };

describe('SelfAssignDialog', () => {
    it('keeps the newer assignments when an older load settles late', async () => {
        const older = deferred<SelfAssignments>();
        const props = {
            initialAgency: AGENCY,
            loadAgencyTopics: async () => [{ id: 2, name: 'Sucht' }],
            onClose: vi.fn(),
        };
        const { rerender } = render(<SelfAssignDialog {...props} loadAssignments={() => older.promise} />);

        const newer = async (): Promise<SelfAssignments> => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [14] });
        rerender(<SelfAssignDialog {...props} loadAssignments={newer} />);
        expect(await screen.findByText(/Nr\. 14/)).toBeInTheDocument();

        await act(async () => {
            older.resolve({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] });
            await older.promise;
        });

        expect(screen.getByText(/Nr\. 14/)).toBeInTheDocument();
    });

    it('keeps "Eintragen" off while the agency topics are still loading', async () => {
        const topics = deferred<{ id: number; name: string }[]>();
        render(
            <SelfAssignDialog
                initialAgency={AGENCY}
                loadAgencyTopics={() => topics.promise}
                loadAssignments={async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] })}
                onClose={vi.fn()}
            />,
        );
        await screen.findByText(/noch in keiner Beratungsstelle/);

        // Unknown topic count: sending now would omit topicIds for a multi-topic agency and get a 400.
        expect(screen.getByRole('button', { name: 'links.selfAssign.confirm' })).toBeDisabled();

        await act(async () => {
            topics.resolve([{ id: 2, name: 'Sucht' }]);
            await topics.promise;
        });
        expect(screen.getByRole('button', { name: 'links.selfAssign.confirm' })).toBeEnabled();
    });

    it('says the topics could not be loaded and keeps "Eintragen" off', async () => {
        render(
            <SelfAssignDialog
                initialAgency={AGENCY}
                loadAgencyTopics={() => Promise.reject(new Error('503'))}
                loadAssignments={async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] })}
                onClose={vi.fn()}
            />,
        );

        expect(
            await screen.findByText(/Themen dieser Beratungsstelle konnten nicht geladen werden/),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'links.selfAssign.confirm' })).toBeDisabled();
    });
});

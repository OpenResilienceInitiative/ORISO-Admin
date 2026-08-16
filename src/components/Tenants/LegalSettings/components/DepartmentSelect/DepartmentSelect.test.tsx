import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_DEPARTMENTS, DepartmentSelect } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (options && typeof options === 'object' && 'count' in (options as Record<string, unknown>)) {
                return `${key}:${(options as { count: number }).count}`;
            }
            return key;
        },
    }),
}));

const open = async () => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
};

/**
 * #583: an admin editing the agency-wide text has to see which Fachbereiche have
 * left the inherited text — they will NOT receive the correction being written.
 */
describe('DepartmentSelect — who still inherits', () => {
    it('marks the departments that carry their own published text', async () => {
        render(
            <DepartmentSelect
                departments={[
                    { id: 3, name: 'U25', hasOwnText: true },
                    { id: 4, name: 'Sucht', hasOwnText: false },
                ]}
                value={ALL_DEPARTMENTS}
                onChange={() => undefined}
            />,
        );
        await open();

        expect(await screen.findByTestId('own-text-3')).toBeInTheDocument();
        expect(screen.queryByTestId('own-text-4')).not.toBeInTheDocument();
    });

    it('says on "Alle Fachbereiche" how many will not receive the change', async () => {
        render(
            <DepartmentSelect
                departments={[
                    { id: 3, name: 'U25', hasOwnText: true },
                    { id: 4, name: 'Sucht', hasOwnText: true },
                    { id: 5, name: 'Schulden', hasOwnText: false },
                ]}
                value={ALL_DEPARTMENTS}
                onChange={() => undefined}
            />,
        );
        await open();

        expect(await screen.findByTestId('departments-with-own-text')).toHaveTextContent(
            'agency.legal.department.notInheriting:2',
        );
    });

    it('stays quiet when every department still inherits', async () => {
        render(
            <DepartmentSelect
                departments={[{ id: 3, name: 'U25', hasOwnText: false }]}
                value={ALL_DEPARTMENTS}
                onChange={() => undefined}
            />,
        );
        await open();

        expect(await screen.findByText('U25')).toBeInTheDocument();
        expect(screen.queryByTestId('departments-with-own-text')).not.toBeInTheDocument();
    });

    it('claims nothing when the backend does not report the state', async () => {
        // An older deployment sends no `departments[]`. A missing marker must not be
        // read as "still inherits" — so the entry carries no claim either way.
        render(
            <DepartmentSelect
                departments={[{ id: 3, name: 'U25' }]}
                value={ALL_DEPARTMENTS}
                onChange={() => undefined}
            />,
        );
        await open();

        expect(await screen.findByText('U25')).toBeInTheDocument();
        expect(screen.queryByTestId('own-text-3')).not.toBeInTheDocument();
        expect(screen.queryByTestId('departments-with-own-text')).not.toBeInTheDocument();
    });

    it('still switches department when a marker is rendered', async () => {
        const onChange = vi.fn();
        render(
            <DepartmentSelect
                departments={[{ id: 3, name: 'U25', hasOwnText: true }]}
                value={ALL_DEPARTMENTS}
                onChange={onChange}
            />,
        );
        await open();
        await userEvent.click(await screen.findByText('U25'));

        expect(onChange).toHaveBeenCalledWith(3);
    });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../../../i18n';
import { CHANGE_TENANT_ERRORS } from '../../../api/counselor/changeConsultantTenant';
import { ChangeTraegerDialog, ChangeTraegerDialogProps } from './ChangeTraegerDialog';

const baseProps = (): ChangeTraegerDialogProps => ({
    consultantName: 'Ada Lovelace',
    fromTraeger: 'Caritas Augsburg',
    toTraeger: 'Diakonie Nord',
    centres: ['20095 Beratungsstelle Nord Hamburg'],
    step: 'confirm',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onDone: vi.fn(),
});

const renderDialog = (props: Partial<ChangeTraegerDialogProps> = {}) => {
    const all = { ...baseProps(), ...props };
    render(<ChangeTraegerDialog {...all} />);
    return all;
};

const dialog = () => screen.getByRole('dialog');

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            addEventListener: vi.fn(),
            addListener: vi.fn(),
            dispatchEvent: vi.fn(),
            matches: false,
            media: query,
            onchange: null,
            removeEventListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    });
});

describe('ChangeTraegerDialog', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('de');
    });

    describe('before saving', () => {
        it('names who moves from which Träger to which, and where they work afterwards', () => {
            renderDialog();

            expect(screen.getByRole('dialog', { name: /Träger von Ada Lovelace wechseln/ })).toBeInTheDocument();
            expect(dialog()).toHaveTextContent('Caritas Augsburg');
            expect(dialog()).toHaveTextContent('Diakonie Nord');
            expect(dialog()).toHaveTextContent('20095 Beratungsstelle Nord Hamburg');
        });

        it('says in general that open cases stay behind when the count is not known yet', () => {
            renderDialog({ openCases: undefined });

            expect(dialog()).toHaveTextContent('Offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“');
            expect(dialog()).not.toHaveTextContent(/\d+ offene Fälle/);
        });

        it('says that colleagues take them over with "Zuständigkeit beendet"', () => {
            renderDialog();

            expect(dialog()).toHaveTextContent(
                /Kolleg:innen bei „Caritas Augsburg“ können .* „Zuständigkeit beendet“ übernehmen/,
            );
        });

        it('advises to hand over or archive first when the move is voluntary', () => {
            renderDialog();

            expect(dialog()).toHaveTextContent(/freiwillig.*zuerst.*übergeben oder archivieren/i);
        });

        it('links to the case handover log to hand over first, opening in a new tab', () => {
            renderDialog({ handoverLogHref: '/admin/logs/case-handover' });

            const link = within(dialog()).getByRole('link', { name: /Fallübergaben/ });
            expect(link).toHaveAttribute('href', '/admin/logs/case-handover');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        });

        it('offers no link when the admin may not read the case handover log', () => {
            renderDialog({ handoverLogHref: undefined });

            expect(within(dialog()).queryByRole('link')).not.toBeInTheDocument();
        });

        it.each([
            [0, 'Es bleiben keine offenen Fälle beim bisherigen Träger zurück.'],
            [1, '1 offener Fall bleibt beim bisherigen Träger „Caritas Augsburg“'],
            [12, '12 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“'],
        ])('states a known count of %i open cases', (openCases, sentence) => {
            renderDialog({ openCases });

            expect(dialog()).toHaveTextContent(sentence);
        });

        it('confirms with "Träger wechseln" and goes back with "Zurück zum Bearbeiten"', async () => {
            const props = renderDialog();

            await userEvent.click(within(dialog()).getByRole('button', { name: 'Träger wechseln' }));
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Zurück zum Bearbeiten' }));

            expect(props.onConfirm).toHaveBeenCalledTimes(1);
            expect(props.onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('while saving', () => {
        it('cannot be confirmed twice or left', () => {
            renderDialog({ step: 'saving' });

            expect(within(dialog()).getByRole('button', { name: 'Träger wechseln' })).toBeDisabled();
            expect(within(dialog()).getByRole('button', { name: 'Zurück zum Bearbeiten' })).toBeDisabled();
        });
    });

    describe('when the server refused', () => {
        it('keeps the edit: shows the reason and offers to go back', async () => {
            const props = renderDialog({ error: CHANGE_TENANT_ERRORS.LAST_COUNSELLOR_OF_CENTRE });

            expect(within(dialog()).getByRole('alert')).toHaveTextContent(/letzte Beratungsperson/);
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Zurück zum Bearbeiten' }));
            expect(props.onCancel).toHaveBeenCalledTimes(1);
        });

        it.each([
            CHANGE_TENANT_ERRORS.IDENTITY_PROVIDER_UNAVAILABLE,
            CHANGE_TENANT_ERRORS.NETWORK,
            CHANGE_TENANT_ERRORS.UNKNOWN,
        ])('%s can be tried again', async (error) => {
            const props = renderDialog({ error });

            await userEvent.click(within(dialog()).getByRole('button', { name: 'Erneut versuchen' }));
            expect(props.onConfirm).toHaveBeenCalledTimes(1);
        });

        it.each([
            CHANGE_TENANT_ERRORS.FORBIDDEN,
            CHANGE_TENANT_ERRORS.SAME_TRAEGER,
            CHANGE_TENANT_ERRORS.ALSO_ADMIN,
            CHANGE_TENANT_ERRORS.NOT_FOUND,
        ])('%s offers no retry that cannot succeed', (error) => {
            renderDialog({ error });

            expect(within(dialog()).queryByRole('button', { name: 'Erneut versuchen' })).not.toBeInTheDocument();
        });

        it.each(
            Object.values(CHANGE_TENANT_ERRORS).flatMap((error) => [[error, 'de'] as const, [error, 'en'] as const]),
        )('%s has its own readable message in %s', async (error, language) => {
            await i18n.changeLanguage(language);
            render(<ChangeTraegerDialog {...baseProps()} error={error} />);

            const text = within(screen.getByRole('alert')).getByText(/\S/).textContent ?? '';
            expect(text).not.toContain('counselor.changeTenant');
            expect(text.length).toBeGreaterThan(20);
        });
    });

    describe('after saving', () => {
        it('tells how many open cases the server left with the old Träger', () => {
            renderDialog({
                step: 'done',
                result: { casesLeftWithPreviousTenant: 3, matrixAccessRevocationsQueued: 2 },
            });

            expect(screen.getByRole('dialog', { name: /Träger gewechselt/ })).toBeInTheDocument();
            expect(dialog()).toHaveTextContent('3 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“');
            expect(dialog()).toHaveTextContent(/„Zuständigkeit beendet“/);
        });

        it('says so when no open case stayed behind', () => {
            renderDialog({
                step: 'done',
                result: { casesLeftWithPreviousTenant: 0, matrixAccessRevocationsQueued: 0 },
            });

            expect(dialog()).toHaveTextContent('Es blieben keine offenen Fälle beim bisherigen Träger zurück.');
            expect(dialog()).not.toHaveTextContent(/Zuständigkeit beendet/);
        });

        it('closes with "Fertig"', async () => {
            const props = renderDialog({
                step: 'done',
                result: { casesLeftWithPreviousTenant: 0, matrixAccessRevocationsQueued: 0 },
            });

            await userEvent.click(within(dialog()).getByRole('button', { name: 'Fertig' }));
            expect(props.onDone).toHaveBeenCalledTimes(1);
        });
    });

    it('speaks English when the admin works in English', async () => {
        await i18n.changeLanguage('en');
        renderDialog({ openCases: 4 });

        expect(screen.getByRole('dialog', { name: /Change Ada Lovelace’s Träger/ })).toBeInTheDocument();
        expect(dialog()).toHaveTextContent('4 open cases stay with the previous Träger “Caritas Augsburg”');
        expect(dialog()).toHaveTextContent('“Assignment ended”');
        expect(within(dialog()).getByRole('button', { name: 'Change Träger' })).toBeInTheDocument();
    });
});

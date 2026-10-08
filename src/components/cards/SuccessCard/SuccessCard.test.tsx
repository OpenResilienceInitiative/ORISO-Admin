import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SuccessCard } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

afterEach(() => vi.unstubAllGlobals());

describe('public registration completion', () => {
    it('confirms success and calls the primary sign-in action once from the keyboard', async () => {
        const user = userEvent.setup();
        const finish = vi.fn();
        render(<SuccessCard onFinish={finish} />);
        expect(screen.getByTestId('registration-success-icon')).toBeInTheDocument();
        await user.tab();
        expect(screen.getByRole('button', { name: 'cards.success.finish' })).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(finish).toHaveBeenCalledTimes(1);
    });

    it('lets a signed-out reader inspect features and open the quick start without a request or notes field', async () => {
        const request = vi.fn();
        vi.stubGlobal('fetch', request);
        const user = userEvent.setup();
        render(<SuccessCard />);
        expect(screen.getByRole('heading', { name: 'registrationGuide.title' })).toBeInTheDocument();
        expect(screen.getByText('registrationGuide.counsellor.features.1')).toBeVisible();
        expect(screen.getByText('registrationGuide.counsellor.features.2')).toBeVisible();
        expect(screen.getByText('registrationGuide.counsellor.features.3')).toBeVisible();
        const summary = screen.getByText('registrationGuide.quickStart');
        const details = summary.closest('details')!;
        expect(summary.tagName).toBe('SUMMARY');
        expect(details).not.toHaveAttribute('open');
        await user.click(summary);
        expect(details).toHaveAttribute('open');
        expect(within(details).getAllByRole('listitem')).toHaveLength(3);
        expect(screen.getByText('registrationGuide.counsellor.tutorials')).toBeVisible();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(request).not.toHaveBeenCalled();
    });

    it('uses agency-admin guidance and preserves caller-owned completion wording', () => {
        render(
            <SuccessCard
                audience="agencyAdmin"
                titleKey="custom.title"
                subtitleKey="custom.subtitle"
                finishKey="custom.finish"
            />,
        );
        expect(screen.getByRole('heading', { name: 'custom.title' })).toBeInTheDocument();
        expect(screen.getByText('custom.subtitle')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'custom.finish' })).toBeInTheDocument();
        expect(screen.getByText('registrationGuide.agencyAdmin.features.1')).toBeInTheDocument();
        expect(screen.getByText('registrationGuide.agencyAdmin.features.2')).toBeInTheDocument();
        expect(screen.getByText('registrationGuide.agencyAdmin.features.3')).toBeInTheDocument();
        expect(screen.getByText('registrationGuide.agencyAdmin.tutorials')).toBeInTheDocument();
        expect(screen.queryByText('registrationGuide.counsellor.features.1')).not.toBeInTheDocument();
    });

    it('keeps the existing explicit notes callback available to callers that wire it', async () => {
        const user = userEvent.setup();
        const changed = vi.fn();
        const NotesExample = () => {
            const [notes, setNotes] = useState('');
            return (
                <SuccessCard
                    notes={notes}
                    onNotesChange={(value) => {
                        setNotes(value);
                        changed(value);
                    }}
                />
            );
        };
        render(<NotesExample />);
        await user.type(screen.getByRole('textbox', { name: 'cards.success.notes' }), 'Local note');
        expect(changed).toHaveBeenLastCalledWith('Local note');
        expect(screen.getByRole('textbox')).toHaveValue('Local note');
    });
});

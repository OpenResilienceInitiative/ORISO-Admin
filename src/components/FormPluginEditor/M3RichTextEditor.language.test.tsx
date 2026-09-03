import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../api/tenant/uploadTenantMedia', () => ({ uploadTenantMedia: vi.fn() }));

import { M3RichTextEditor } from './M3RichTextEditor';

/**
 * Owner report 2026-09-03: as Träger and as Beratungsstellen-Admin the language
 * control was gone, while the platform admin still saw it. It is not a role
 * check — the control was hidden whenever the tenant had a single active
 * language, and only the main tenant has several. Admin design rule for the
 * legal editors is disable-never-hide.
 */
describe('M3RichTextEditor language control', () => {
    it('stays visible but inert when the tenant has a single active language', () => {
        render(<M3RichTextEditor title="Datenschutz" languages={[{ value: 'de', label: 'Deutsch' }]} language="de" />);

        const control = screen.getByRole('button', { name: 'legal.m3Editor.chooseLanguage' });
        expect(control).toBeInTheDocument();
        expect(control).toBeDisabled();
    });

    it('switches language when several are active', async () => {
        const user = userEvent.setup();
        const onLanguageChange = vi.fn();
        render(
            <M3RichTextEditor
                title="Datenschutz"
                languages={[
                    { value: 'de', label: 'Deutsch' },
                    { value: 'en', label: 'English' },
                ]}
                language="de"
                onLanguageChange={onLanguageChange}
            />,
        );

        const control = screen.getByRole('button', { name: 'legal.m3Editor.chooseLanguage' });
        expect(control).toBeEnabled();

        await user.click(control);
        await user.click(await screen.findByText('English'));

        expect(onLanguageChange).toHaveBeenCalledWith('en');
    });
});

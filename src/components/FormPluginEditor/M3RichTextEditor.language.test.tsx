import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

    it('stays visible but inert when the tenant has no active language', () => {
        render(<M3RichTextEditor title="Datenschutz" languages={[]} language="de" />);

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

describe('M3RichTextEditor HTML language boundary', () => {
    it('uses valid German HTML on the draft and both informal comparison surfaces', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <M3RichTextEditor
                title="Draft"
                value="<p>Mein Entwurf</p>"
                contentLanguage="de@informal"
                language="de@informal"
                comparison={{
                    title: 'Informal template',
                    html: '<p>Deine Vorlage</p>',
                    language: 'de@informal',
                    open: true,
                }}
            />,
        );
        expect(screen.getByRole('textbox').closest('[lang]')).toHaveAttribute('lang', 'de');
        const reference = screen.getByRole('complementary', { name: 'Informal template' });
        expect(within(reference).getByRole('region', { name: 'Informal template' })).toHaveAttribute('lang', 'de');
        await user.click(within(reference).getByRole('button', { name: 'legal.m3Editor.maximizeTemplate' }));
        const dialog = await screen.findByRole('dialog', { name: 'Informal template' });
        expect(within(dialog).getByRole('region', { name: 'Informal template' })).toHaveAttribute('lang', 'de');
        expect(container.querySelector('[lang="de@informal"]')).toBeNull();
    });

    it('keeps the informal content key when the author chooses its language', async () => {
        const user = userEvent.setup();
        const onLanguageChange = vi.fn();
        render(
            <M3RichTextEditor
                title="Draft"
                language="en"
                languages={[
                    { value: 'en', label: 'English' },
                    { value: 'de@informal', label: 'Deutsch (Du)' },
                ]}
                onLanguageChange={onLanguageChange}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.chooseLanguage' }));
        await user.click(await screen.findByText('Deutsch (Du)'));
        expect(onLanguageChange).toHaveBeenCalledExactlyOnceWith('de@informal');
    });
});

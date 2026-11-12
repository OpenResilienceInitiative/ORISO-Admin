import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { JsonSchema } from '../../addons/addonTypes';
import { AddonSettingsForm } from './AddonSettingsForm';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const schema: JsonSchema = {
    type: 'object',
    required: ['greeting'],
    properties: {
        greeting: { type: 'string', title: 'Greeting', description: 'Shown on top' },
        intro: { type: 'string', title: 'Intro', format: 'textarea' },
        mode: { type: 'string', title: 'Mode', enum: ['simple', 'expert'] },
        showTips: { type: 'boolean', title: 'Show tips' },
        maxTools: { type: 'integer', title: 'Max tools', minimum: 1, maximum: 9 },
    },
};

describe('AddonSettingsForm', () => {
    it('renders one control per schema property with labels and descriptions', () => {
        render(<AddonSettingsForm formId="form" schema={schema} values={{}} onSubmit={vi.fn()} />);

        expect(screen.getByLabelText('Greeting').tagName).toBe('INPUT');
        expect(screen.getByLabelText('Intro').tagName).toBe('TEXTAREA');
        expect(screen.getByRole('switch', { name: 'Show tips' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Mode' })).toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: 'Max tools' })).toBeInTheDocument();
        expect(screen.getByText('Shown on top')).toBeInTheDocument();
    });

    it('collects typed values on save', async () => {
        const onSubmit = vi.fn();
        render(
            <AddonSettingsForm
                formId="form"
                schema={schema}
                values={{ greeting: 'Hallo', maxTools: 2 }}
                onSubmit={onSubmit}
            />,
        );

        await userEvent.click(screen.getByRole('switch', { name: 'Show tips' }));
        const maxTools = screen.getByRole('spinbutton', { name: 'Max tools' });
        await userEvent.clear(maxTools);
        await userEvent.type(maxTools, '5');
        fireEvent.click(screen.getByRole('button', { name: 'addons.settings.save' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ greeting: 'Hallo', showTips: true, maxTools: 5 }));
    });

    it('blocks saving while a required field is empty', async () => {
        const onSubmit = vi.fn();
        render(<AddonSettingsForm formId="form" schema={schema} values={{}} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole('button', { name: 'addons.settings.save' }));

        expect(await screen.findByText('addons.validation.required')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('says so when the add-on has no settings', () => {
        render(<AddonSettingsForm formId="form" schema={null} values={{}} onSubmit={vi.fn()} />);
        expect(screen.getByText('addons.settings.none')).toBeInTheDocument();
    });
});

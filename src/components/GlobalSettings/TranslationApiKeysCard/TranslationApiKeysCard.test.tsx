import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationApiKeysCard } from './index';
import m3ButtonStyles from '../../M3Button/styles.module.scss';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') {
                return options;
            }
            if (options && typeof options === 'object') {
                return `${key}:${Object.values(options).join(':')}`;
            }
            return key;
        },
    }),
}));

const saveButtonName = 'legal.translation.settings.save';

describe('TranslationApiKeysCard', () => {
    it('shows the masked stored key per provider and a hint when none is stored', () => {
        render(<TranslationApiKeysCard keys={{ openrouter: 'sk-…abcd' }} onSave={() => undefined} />);

        expect(screen.getByText('legal.translation.settings.currentKey:sk-…abcd')).toBeInTheDocument();
        expect(screen.getByText('legal.translation.settings.noKey')).toBeInTheDocument();
        expect(screen.getByText('legal.translation.settings.provider.openrouter')).toBeInTheDocument();
        expect(screen.getByText('legal.translation.settings.provider.mistral')).toBeInTheDocument();
    });

    it('saves a new key for the right provider', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        render(<TranslationApiKeysCard keys={{}} onSave={onSave} />);

        const [openrouterInput] = screen.getAllByLabelText('legal.translation.settings.newKey');
        await user.type(openrouterInput, ' sk-fresh ');
        await user.click(screen.getAllByRole('button', { name: saveButtonName })[0]);

        expect(onSave).toHaveBeenCalledWith('openrouter', 'sk-fresh');
    });

    it('does not save an empty key', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        render(<TranslationApiKeysCard keys={{}} onSave={onSave} />);

        await user.click(screen.getAllByRole('button', { name: saveButtonName })[1]);

        expect(onSave).not.toHaveBeenCalled();
    });

    it('renders visible-but-disabled for non-superadmins (never hidden)', () => {
        render(<TranslationApiKeysCard keys={{}} onSave={() => undefined} disabled />);

        screen.getAllByLabelText('legal.translation.settings.newKey').forEach((input) => {
            expect(input).toBeDisabled();
        });
        screen.getAllByRole('button', { name: saveButtonName }).forEach((button) => {
            expect(button).toBeDisabled();
        });
        // Still visible: the ORISO rule is disable, not hide.
        expect(screen.getByText('legal.translation.settings.provider.openrouter')).toBeInTheDocument();
    });

    it('renders save actions with the shared transparent outlined button', () => {
        render(<TranslationApiKeysCard keys={{}} onSave={() => undefined} />);

        screen.getAllByRole('button', { name: saveButtonName }).forEach((button) => {
            expect(button).toHaveClass(m3ButtonStyles.outlined);
        });
    });

    it('keeps a visible and disabled progress state only on the provider being saved', () => {
        render(<TranslationApiKeysCard keys={{}} onSave={() => undefined} savingProvider="openrouter" />);

        const [openrouterSave, mistralSave] = screen.getAllByRole('button', { name: saveButtonName });
        expect(openrouterSave).toBeDisabled();
        expect(openrouterSave).toHaveAttribute('aria-busy', 'true');
        expect(openrouterSave.querySelector('[role="progressbar"]')).toBeInTheDocument();
        expect(mistralSave).toBeEnabled();
        expect(mistralSave).not.toHaveAttribute('aria-busy');
    });
});

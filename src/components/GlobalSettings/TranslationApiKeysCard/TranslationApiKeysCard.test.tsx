import React from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationApiKeysCard } from './index';
import m3ButtonStyles from '../../M3Button/styles.module.scss';
import { TranslationApiError } from '../../../api/tenant/translation';

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
    describe('key test (Frank, 2026-11-24)', () => {
        const testButton = (provider: string) =>
            within(screen.getByTestId(`translation-key-actions-${provider}`)).getByRole('button', {
                name: 'legal.translation.settings.test',
            });

        it('calls the API for that provider and shows the model reply', async () => {
            const user = userEvent.setup({ delay: null });
            const onTest = vi.fn().mockResolvedValue({
                provider: 'mistral',
                model: 'mistral-small-latest',
                sourceText: 'Guten Tag!',
                reply: 'Good day!',
                latencyMs: 412,
            });
            render(<TranslationApiKeysCard keys={{ mistral: 'sk-…f9x2' }} onSave={() => undefined} onTest={onTest} />);

            await user.click(testButton('mistral'));

            expect(onTest).toHaveBeenCalledWith('mistral');
            const result = await screen.findByTestId('translation-key-test-result-mistral');
            expect(result).toHaveTextContent('legal.translation.settings.testOk');
            expect(result).toHaveTextContent('mistral-small-latest:412:Guten Tag!:Good day!');
        });

        it('explains a rejected key in plain words', async () => {
            const user = userEvent.setup({ delay: null });
            const onTest = vi.fn().mockRejectedValue(new TranslationApiError('TRANSLATION_KEY_INVALID', 'openrouter'));
            render(
                <TranslationApiKeysCard keys={{ openrouter: 'sk-…abcd' }} onSave={() => undefined} onTest={onTest} />,
            );

            await user.click(testButton('openrouter'));

            const result = await screen.findByTestId('translation-key-test-result-openrouter');
            expect(result).toHaveTextContent('legal.translation.settings.testFailed');
            expect(result).toHaveTextContent('legal.translation.error.keyInvalid');
        });

        it('cannot test a provider without a stored key', () => {
            render(
                <TranslationApiKeysCard keys={{ openrouter: 'sk-…abcd' }} onSave={() => undefined} onTest={vi.fn()} />,
            );

            expect(testButton('openrouter')).toBeEnabled();
            expect(testButton('mistral')).toBeDisabled();
        });
    });
});

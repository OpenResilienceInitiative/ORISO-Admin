import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslateOnPublishModal } from './index';

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

const baseProps = {
    open: true,
    sourceLanguage: 'de',
    targetLanguages: ['en', 'fr'],
    onConfirm: () => undefined,
    onSkip: () => undefined,
    onCancel: () => undefined,
};

describe('TranslateOnPublishModal', () => {
    it('preselects all target languages and confirms with them', async () => {
        const user = userEvent.setup({ delay: null });
        const onConfirm = vi.fn();
        render(<TranslateOnPublishModal {...baseProps} onConfirm={onConfirm} />);

        expect(screen.getByRole('checkbox', { name: 'en' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'fr' })).toBeChecked();

        await user.click(screen.getByRole('button', { name: 'legal.translation.modal.confirm' }));
        expect(onConfirm).toHaveBeenCalledWith(['en', 'fr']);
    });

    it('confirms only with the still-selected languages after deselecting one', async () => {
        const user = userEvent.setup({ delay: null });
        const onConfirm = vi.fn();
        render(<TranslateOnPublishModal {...baseProps} onConfirm={onConfirm} />);

        await user.click(screen.getByRole('checkbox', { name: 'fr' }));
        await user.click(screen.getByRole('button', { name: 'legal.translation.modal.confirm' }));

        expect(onConfirm).toHaveBeenCalledWith(['en']);
    });

    it('publishes without translation via the skip button', async () => {
        const user = userEvent.setup({ delay: null });
        const onSkip = vi.fn();
        render(<TranslateOnPublishModal {...baseProps} onSkip={onSkip} />);

        await user.click(screen.getByRole('button', { name: 'legal.translation.modal.skip' }));
        expect(onSkip).toHaveBeenCalled();
    });

    it('shows the human error message (already mapped, never a raw code)', () => {
        render(<TranslateOnPublishModal {...baseProps} errorKey="legal.translation.error.keyInvalid" />);
        expect(screen.getByText('legal.translation.error.keyInvalid')).toBeInTheDocument();
    });

    it('locks cancel and skip while translating', () => {
        render(<TranslateOnPublishModal {...baseProps} translating />);
        expect(screen.getByRole('button', { name: 'legal.translation.modal.cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'legal.translation.modal.skip' })).toBeDisabled();
    });
});

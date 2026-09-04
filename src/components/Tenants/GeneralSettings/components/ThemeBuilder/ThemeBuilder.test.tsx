import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeEditorModal } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./MiniChatPreview', () => ({
    MiniChatPreview: () => <div data-testid="theme-preview" />,
}));

const usableInitialValues = {
    theming: {
        primaryColor: '#a5000a',
        accent: '#ffe2de',
    },
};

const unusableInitialValues = {
    theming: {
        primaryColor: '#000000',
        accent: '#ffe2de',
    },
};

const locks = { accentDark: false, accentLight: false };

describe('ThemeEditorModal', () => {
    it('tells the admin at save time when the seed cannot yield a palette', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();

        render(
            <ThemeEditorModal
                open
                initialValues={unusableInitialValues}
                storedSeeds={{ accentDark: '#000000', accentLight: '#ffe2de' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        // Field error + dialog Alert both use the same key.
        expect((await screen.findAllByText('theme.builder.seedUnusable')).length).toBeGreaterThan(0);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('saves a chromatic brand seed', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();

        render(
            <ThemeEditorModal
                open
                initialValues={usableInitialValues}
                storedSeeds={{ accentDark: '#a5000a', accentLight: '#ffe2de' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryByText('theme.builder.seedUnusable')).not.toBeInTheDocument();
    });
});

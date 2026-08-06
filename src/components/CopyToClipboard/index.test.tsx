import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyToClipboard } from './index';

const mocks = vi.hoisted(() => ({
    notificationSuccess: vi.fn(),
}));

vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return {
        ...actual,
        notification: {
            ...actual.notification,
            success: mocks.notificationSuccess,
        },
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => `translated:${key}` }),
}));

vi.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({
        children,
        onCopy,
    }: {
        children: React.ReactElement<{ onClick?: () => void }>;
        onCopy: () => void;
    }) => React.cloneElement(children, { onClick: onCopy }),
}));

vi.mock('../../resources/img/svg/copy.svg', () => ({
    ReactComponent: (props: React.HTMLAttributes<HTMLButtonElement>) => (
        <button type="button" aria-label="copy" {...props} />
    ),
}));

describe('CopyToClipboard', () => {
    it('renders the copied text and shows a success notification after copy', async () => {
        const user = userEvent.setup();
        render(<CopyToClipboard copiedKey="custom.copy.success">https://oriso.test/invite/token</CopyToClipboard>);

        expect(screen.getByText('https://oriso.test/invite/token')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'copy' }));

        expect(mocks.notificationSuccess).toHaveBeenCalledWith({
            message: 'translated:custom.copy.success',
        });
    });
});

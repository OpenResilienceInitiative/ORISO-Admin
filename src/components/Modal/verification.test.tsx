import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Modal } from './index';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('shared modal verification', () => {
    it('renders the real modal without deprecated lifecycle-prop warnings', () => {
        const error = vi.spyOn(console, 'error');
        try {
            render(
                <Modal title="Verification dialog">
                    <p>Dialog content</p>
                </Modal>,
            );
            expect(screen.getByRole('dialog')).toHaveTextContent('Dialog content');
            expect(error).not.toHaveBeenCalled();
        } finally {
            error.mockRestore();
        }
    });
});

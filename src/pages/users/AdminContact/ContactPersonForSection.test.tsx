import { fireEvent, render, screen } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ContactPersonForSection } from './index';

vi.mock('react-i18next', () => {
    const t = (key: string, options?: { centres?: string }) => (options?.centres ? `${key}:${options.centres}` : key);
    return { useTranslation: () => Object.assign([t], { t }) };
});

const NORD = { agencyId: 1, agencyName: 'Beratungsstelle Nord', role: 'CONTACT' as const };

const renderSection = (props: Partial<Parameters<typeof ContactPersonForSection>[0]> = {}) =>
    render(
        <Form>
            <ContactPersonForSection centres={[NORD]} {...props} />
        </Form>,
    );

/** ORISO-Admin#1534: "Ansprechperson für" while some centres are still loading or failed. */
describe('ContactPersonForSection', () => {
    it('keeps the failure and its retry in the tile, not only in the closable pop-up', () => {
        const onRetry = vi.fn();
        renderSection({ failedCentres: ['Suchtberatung Ost'], onRetry });

        expect(screen.getByTestId('contact-role-load-failed')).toHaveTextContent(
            'admin.contactPersonFor.loadFailed:Suchtberatung Ost',
        );
        fireEvent.click(screen.getByRole('button', { name: 'admin.contactPersonFor.retry' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('still says it is loading while one centre is shown and another is pending', () => {
        renderSection({ loading: true });

        expect(screen.getByRole('status')).toHaveTextContent('admin.contactPersonFor.loading');
        expect(screen.getByRole('group', { name: 'Beratungsstelle Nord' })).toBeInTheDocument();
    });
});

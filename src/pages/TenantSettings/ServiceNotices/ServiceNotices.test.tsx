import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ServiceNoticeDraft,
    ServiceNoticePreview,
    ServiceNoticeVariant,
} from '../../../api/serviceNotices/serviceNotices';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
    roles: { isSuperAdmin: true, isTechnicalAccount: false, tokenUnreadable: false },
}));
vi.mock('../../../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../api/fetchData')>()),
    fetchData: mocks.fetchData,
}));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => mocks.roles }));
import { ServiceNoticesPage } from './index';
import { SERVICE_NOTICE_VARIANTS } from '../../../api/serviceNotices/serviceNotices';

const draft: ServiceNoticeDraft = {
    campaignKey: 'planned-window',
    status: 'DRAFT',
    maintenanceDate: '2026-12-01',
    maintenanceStart: '09:00:00',
    maintenanceEnd: '10:00:00',
    statusUrl: 'https://status.example.org',
};
const previewFor = (variant: ServiceNoticeVariant): ServiceNoticePreview => ({
    campaignKey: draft.campaignKey,
    variant,
    subject: `Actual subject ${variant}`,
    preheader: `Actual preview ${variant}`,
    html: `<html><body><a href="https://status.example.org">${variant}</a></body></html>`,
    text: `Actual plain text ${variant}`,
});
const renderPage = () =>
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
        >
            <ServiceNoticesPage />
        </QueryClientProvider>,
    );
const setField = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillDraft = () => {
    setField('serviceNotices.reference', draft.campaignKey);
    setField('serviceNotices.date', draft.maintenanceDate);
    setField('serviceNotices.start', '09:00');
    setField('serviceNotices.end', '10:00');
    setField('serviceNotices.statusUrl', draft.statusUrl);
};
const openDraft = async () => {
    setField('serviceNotices.reference', draft.campaignKey);
    await userEvent.click(screen.getByRole('button', { name: 'serviceNotices.open' }));
    await screen.findByText('Actual subject de-sie');
};

describe('service-notice saved drafts', () => {
    beforeEach(() => {
        Object.assign(mocks.roles, { isSuperAdmin: true, isTechnicalAccount: false, tokenUnreadable: false });
        mocks.fetchData.mockReset().mockImplementation(({ url }: { url: string }) => {
            if (url.includes('/preview?'))
                return Promise.resolve(
                    previewFor(
                        new URL(url, 'https://fixture.example.org').searchParams.get('variant') as ServiceNoticeVariant,
                    ),
                );
            return Promise.resolve(draft);
        });
    });

    it('starts with no host, text composer, preview, automatic read or delivery control', () => {
        renderPage();
        expect(screen.getByLabelText('serviceNotices.statusUrl')).toHaveValue('');
        expect(screen.queryByTestId('service-notice-preview-frame')).not.toBeInTheDocument();
        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'serviceNotices.save',
            'serviceNotices.open',
        ]);
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it('saves the validated four fields and shows only the returned saved preview in a sandbox', async () => {
        renderPage();
        fillDraft();
        await userEvent.click(screen.getByRole('button', { name: 'serviceNotices.save' }));
        await screen.findByText('Actual subject de-sie');
        const put = mocks.fetchData.mock.calls.find(([request]) => request.method === 'PUT')?.[0];
        expect(JSON.parse(put.bodyData)).toEqual({
            maintenanceDate: draft.maintenanceDate,
            maintenanceStart: '09:00',
            maintenanceEnd: '10:00',
            statusUrl: draft.statusUrl,
        });
        const frame = screen.getByTestId('service-notice-preview-frame');
        expect(frame).toHaveAttribute('sandbox', '');
        expect(frame).toHaveAttribute('srcdoc', previewFor('de-sie').html);
        setField('serviceNotices.start', '11:00');
        expect(screen.getByText('Actual plain text de-sie')).toBeInTheDocument();
        expect(mocks.fetchData).toHaveBeenCalledTimes(2);
    });

    it('reopens a known reference with only its key required and uses authoritative saved fields', async () => {
        renderPage();
        await openDraft();
        expect(screen.getByLabelText('serviceNotices.date')).toHaveValue(draft.maintenanceDate);
        expect(screen.getByLabelText('serviceNotices.start')).toHaveValue('09:00');
        expect(screen.getByLabelText('serviceNotices.statusUrl')).toHaveValue(draft.statusUrl);
        expect(mocks.fetchData.mock.calls[0][0].method).toBe('GET');
    });

    it('retains every changed input and the last saved preview on a 409 conflict', async () => {
        renderPage();
        await openDraft();
        setField('serviceNotices.start', '11:00');
        mocks.fetchData.mockImplementation(({ method, url }: { method: string; url: string }) =>
            method === 'PUT'
                ? Promise.reject(new Response(null, { status: 409 }))
                : Promise.resolve(url.includes('/preview?') ? previewFor('de-sie') : draft),
        );
        await userEvent.click(screen.getByRole('button', { name: 'serviceNotices.save' }));
        expect(await screen.findByText('serviceNotices.errors.conflict')).toBeInTheDocument();
        expect(screen.getByLabelText('serviceNotices.start')).toHaveValue('11:00');
        expect(screen.getByLabelText('serviceNotices.reference')).toHaveValue(draft.campaignKey);
        expect(screen.getByLabelText('serviceNotices.statusUrl')).toHaveValue(draft.statusUrl);
        expect(screen.getByText('Actual subject de-sie')).toBeInTheDocument();
        expect(mocks.fetchData.mock.calls.filter(([request]) => request.method === 'PUT')).toHaveLength(1);
    });

    it('requests all seven actual language variants and displays their returned subject and plain text', async () => {
        renderPage();
        await openDraft();
        await SERVICE_NOTICE_VARIANTS.slice(1).reduce(async (previous, variant) => {
            await previous;
            await userEvent.click(screen.getByRole('combobox', { name: 'serviceNotices.variant' }));
            await userEvent.click(
                within(await screen.findByRole('listbox')).getByRole('option', {
                    name: `serviceNotices.variants.${variant}`,
                }),
            );
            expect(await screen.findByText(`Actual subject ${variant}`)).toBeInTheDocument();
            expect(screen.getByText(`Actual plain text ${variant}`)).toBeInTheDocument();
        }, Promise.resolve());
        expect(mocks.fetchData.mock.calls.filter(([request]) => request.url.includes('/preview?'))).toHaveLength(7);
    });

    it('refuses a backend language substitute instead of presenting it as the requested language', async () => {
        mocks.fetchData.mockImplementation(({ url }: { url: string }) =>
            Promise.resolve(url.includes('/preview?') ? previewFor('de-du') : draft),
        );
        renderPage();
        setField('serviceNotices.reference', draft.campaignKey);
        await userEvent.click(screen.getByRole('button', { name: 'serviceNotices.open' }));
        expect(await screen.findByText('serviceNotices.errors.variantUnavailable')).toBeInTheDocument();
        expect(screen.queryByTestId('service-notice-preview-frame')).not.toBeInTheDocument();
        expect(screen.queryByText('Actual subject de-du')).not.toBeInTheDocument();
    });

    it('retains fields on unavailable read and never prints a server exception body', async () => {
        mocks.fetchData.mockRejectedValue(new Response('remote-sensitive-marker', { status: 502 }));
        renderPage();
        fillDraft();
        await userEvent.click(screen.getByRole('button', { name: 'serviceNotices.open' }));
        await screen.findByText('serviceNotices.errors.unavailable');
        expect(screen.getByLabelText('serviceNotices.statusUrl')).toHaveValue(draft.statusUrl);
        expect(screen.queryByText('remote-sensitive-marker')).not.toBeInTheDocument();
    });

    it('self-guards a technical account even if it also carries platform roles', async () => {
        mocks.roles.isTechnicalAccount = true;
        renderPage();
        expect(screen.getByRole('alert')).toHaveTextContent('serviceNotices.errors.forbidden');
        await waitFor(() => expect(mocks.fetchData).not.toHaveBeenCalled());
    });
});

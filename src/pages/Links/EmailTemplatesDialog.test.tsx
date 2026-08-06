import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../components/ListingTable', () => ({
    ListingTable: ({ columns = [], dataSource = [], onRow }: any) => (
        <div data-testid="listing-table">
            {dataSource.map((row: any, rowIndex: number) => (
                // Stand-in for antd's <tr>, which carries the same handlers — the a11y
                // rules for real interactive markup do not apply to this test double.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <div
                    key={row.id ?? rowIndex}
                    data-testid="template-row"
                    onClick={onRow?.(row)?.onClick}
                    onDoubleClick={onRow?.(row)?.onDoubleClick}
                >
                    {columns.map((column: any, columnIndex: number) => {
                        const value = column.dataIndex ? row[column.dataIndex] : undefined;
                        const cell = column.render ? column.render(value, row, rowIndex) : value;
                        return <div key={column.key ?? column.dataIndex ?? columnIndex}>{cell}</div>;
                    })}
                </div>
            ))}
        </div>
    ),
    listingTableStyles: new Proxy({}, { get: () => undefined }),
}));

const mocks = vi.hoisted(() => ({
    listInviteEmailTemplates: vi.fn(),
    createInviteEmailTemplate: vi.fn(),
    updateInviteEmailTemplate: vi.fn(),
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    listInviteEmailTemplates: mocks.listInviteEmailTemplates,
    createInviteEmailTemplate: mocks.createInviteEmailTemplate,
    updateInviteEmailTemplate: mocks.updateInviteEmailTemplate,
}));

// antd's real Select relies on rc-select's virtual-list/portal machinery, which is
// flaky to drive under jsdom (no real layout/scroll). Swap it for a native <select>
// that Form.Item still controls the same way (via the value/onChange it injects),
// so the Kind field stays fully exercised through Form validation and submission.
vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return {
        ...actual,
        Select: ({ options = [], value, onChange, ...rest }: any) => (
            <select {...rest} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)}>
                <option value="" disabled />
                {options.map((option: any) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        ),
    };
});

// antd's Modal relies on matchMedia, which jsdom does not implement.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

import { EmailTemplatesDialog } from './EmailTemplatesDialog';

const tenantTemplate = {
    id: 1,
    kind: 'TENANT_INVITE',
    name: 'Default tenant template',
    language: 'de',
    subject: 'Willkommen',
    body: 'Hallo {{firstName}}',
    active: true,
    createDate: '2026-07-01T10:00:00Z',
    updateDate: '2026-07-02T10:00:00Z',
};

const counsellorTemplate = {
    id: 2,
    kind: 'COUNSELLOR_INVITE',
    name: 'Default counsellor template',
    language: 'en',
    subject: 'Welcome',
    body: 'Hi {{firstName}}',
    active: false,
    createDate: '2026-07-01T10:00:00Z',
    updateDate: null,
};

describe('EmailTemplatesDialog', () => {
    beforeEach(() => {
        mocks.listInviteEmailTemplates.mockReset();
        mocks.createInviteEmailTemplate.mockReset();
        mocks.updateInviteEmailTemplate.mockReset();
        mocks.listInviteEmailTemplates.mockImplementation((kind: string) => {
            if (kind === 'TENANT_INVITE') return Promise.resolve([tenantTemplate]);
            if (kind === 'COUNSELLOR_INVITE') return Promise.resolve([counsellorTemplate]);
            return Promise.resolve([]);
        });
    });

    const renderDialog = (overrides: Partial<React.ComponentProps<typeof EmailTemplatesDialog>> = {}) =>
        render(
            <EmailTemplatesDialog templateKind="TENANT_INVITE" onClose={vi.fn()} onChanged={vi.fn()} {...overrides} />,
        );

    it('lists templates of every kind, the opening tab kind first', async () => {
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));
        const rows = screen.getAllByTestId('template-row');
        expect(within(rows[0]).getByText('Default tenant template')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Default counsellor template')).toBeInTheDocument();
    });

    it('creates a template preset to the opening kind, notifies the opener, and refreshes', async () => {
        const user = userEvent.setup();
        const onChanged = vi.fn();
        const saved = { ...tenantTemplate, id: 3, name: 'New tenant welcome' };
        mocks.createInviteEmailTemplate.mockResolvedValue(saved);
        renderDialog({ onChanged });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));

        await user.click(screen.getByRole('button', { name: 'New template' }));
        const dialog = screen.getByRole('dialog');
        const withinDialog = within(dialog);

        // Kind is preset to the opening tab's kind — no manual selection needed.
        expect(withinDialog.getByLabelText('Kind')).toHaveValue('TENANT_INVITE');

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'New tenant welcome');
        await user.type(withinDialog.getByLabelText('Subject'), 'Hi there');
        // fireEvent.change avoids userEvent's {{/}} key-sequence escaping for literal braces.
        fireEvent.change(withinDialog.getByLabelText('Body'), { target: { value: 'Body {{email}}' } });

        await user.click(withinDialog.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(mocks.createInviteEmailTemplate).toHaveBeenCalledTimes(1));
        expect(mocks.createInviteEmailTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'New tenant welcome',
                subject: 'Hi there',
                body: 'Body {{email}}',
                kind: 'TENANT_INVITE',
                active: true,
            }),
        );
        expect(onChanged).toHaveBeenCalledWith(saved);

        // Back on the list view, which refetches (3 kinds on mount, 3 more on refresh).
        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalledTimes(6));
    });

    it('renders a live email preview from the subject and body fields', async () => {
        const user = userEvent.setup();
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));
        await user.click(screen.getByRole('button', { name: 'New template' }));

        const dialog = screen.getByRole('dialog');
        const withinDialog = within(dialog);
        await user.type(withinDialog.getByLabelText('Subject'), 'Welcome to ORISO');
        fireEvent.change(withinDialog.getByLabelText('Body'), {
            target: { value: 'Hello Hugo,\n\nUse {{inviteLink}} to finish setup.' },
        });

        const preview = withinDialog.getByRole('region', { name: 'Email preview' });
        expect(within(preview).getByRole('heading', { name: 'Welcome to ORISO' })).toBeInTheDocument();
        expect(within(preview).getByText(/Hello Hugo/)).toBeInTheDocument();
        expect(within(preview).getByText('{{inviteLink}}')).toBeInTheDocument();
    });

    it('opens a prefilled edit form on row double-click and updates the template', async () => {
        const user = userEvent.setup();
        mocks.updateInviteEmailTemplate.mockResolvedValue({ ...tenantTemplate, subject: 'Servus' });
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);

        const dialog = screen.getByRole('dialog');
        const withinDialog = within(dialog);
        expect(withinDialog.getByLabelText('Vorlagenname')).toHaveValue('Default tenant template');

        fireEvent.change(withinDialog.getByLabelText('Subject'), { target: { value: 'Servus' } });
        await user.click(withinDialog.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(mocks.updateInviteEmailTemplate).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ subject: 'Servus' }),
            ),
        );
    });

    it('selects a template when its name is clicked in picker mode', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));

        await user.click(screen.getByRole('button', { name: 'Default tenant template' }));

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('leaves templates of another kind or inactive ones unselectable', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));

        // Inactive COUNSELLOR_INVITE template in a TENANT_INVITE tab: plain text, and a
        // row click must not hand it to the composer either.
        expect(screen.queryByRole('button', { name: 'Default counsellor template' })).not.toBeInTheDocument();
        await user.click(screen.getAllByTestId('template-row')[1]);

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('keeps the edit button working in picker mode instead of selecting', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));

        await user.click(within(screen.getAllByTestId('template-row')[0]).getByRole('button', { name: 'Edit' }));

        expect(onSelect).not.toHaveBeenCalled();
        expect(within(screen.getByRole('dialog')).getByLabelText('Vorlagenname')).toHaveValue(
            'Default tenant template',
        );
    });

    it('shows the translated error message (not raw server text) when create fails', async () => {
        const user = userEvent.setup();
        mocks.createInviteEmailTemplate.mockRejectedValue(new Error('CATCH_ALL'));
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(2));

        await user.click(screen.getByRole('button', { name: 'New template' }));
        const dialog = screen.getByRole('dialog');
        const withinDialog = within(dialog);

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'Broken template');
        await user.type(withinDialog.getByLabelText('Subject'), 'Subject');
        await user.type(withinDialog.getByLabelText('Body'), 'Body');

        await user.click(withinDialog.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Could not create template')).toBeInTheDocument();
        expect(screen.queryByText('CATCH_ALL')).not.toBeInTheDocument();
    });
});

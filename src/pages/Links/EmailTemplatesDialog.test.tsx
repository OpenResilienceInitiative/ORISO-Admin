import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const t = (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key);

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
// that stays controlled the same way (value/onChange), so the Kind field remains
// fully exercised through selection and submission.
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

// antd's Modal and Dropdown rely on matchMedia, which jsdom does not implement.
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

const tenantTemplateShort = {
    id: 4,
    kind: 'TENANT_INVITE',
    name: 'Short tenant template',
    language: 'de',
    subject: 'Kurz',
    body: 'Link: {{inviteLink}}',
    active: true,
    createDate: '2026-07-03T10:00:00Z',
    updateDate: null,
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

/** The srcDoc of the email-kit preview frame inside the currently open dialog. */
const previewSrcDoc = () =>
    within(screen.getByRole('dialog')).getByTitle('E-Mail-Vorschau').getAttribute('srcdoc') ?? '';

describe('EmailTemplatesDialog', () => {
    beforeEach(() => {
        mocks.listInviteEmailTemplates.mockReset();
        mocks.createInviteEmailTemplate.mockReset();
        mocks.updateInviteEmailTemplate.mockReset();
        mocks.listInviteEmailTemplates.mockImplementation((kind: string) => {
            if (kind === 'TENANT_INVITE') return Promise.resolve([tenantTemplate, tenantTemplateShort]);
            if (kind === 'COUNSELLOR_INVITE') return Promise.resolve([counsellorTemplate]);
            return Promise.resolve([]);
        });
    });

    const renderDialog = (overrides: Partial<React.ComponentProps<typeof EmailTemplatesDialog>> = {}) =>
        render(
            <EmailTemplatesDialog templateKind="TENANT_INVITE" onClose={vi.fn()} onChanged={vi.fn()} {...overrides} />,
        );

    const openCreateForm = async (user: ReturnType<typeof userEvent.setup>) => {
        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        await user.click(screen.getByRole('button', { name: 'New template' }));
        return within(screen.getByRole('dialog'));
    };

    it('lists templates of every kind, the opening tab kind first', async () => {
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        const rows = screen.getAllByTestId('template-row');
        expect(within(rows[0]).getByText('Default tenant template')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Short tenant template')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Default counsellor template')).toBeInTheDocument();
    });

    it('creates a template preset to the opening kind, notifies the opener, and refreshes', async () => {
        const user = userEvent.setup();
        const onChanged = vi.fn();
        const saved = { ...tenantTemplate, id: 3, name: 'New tenant welcome' };
        mocks.createInviteEmailTemplate.mockResolvedValue(saved);
        renderDialog({ onChanged });

        const withinDialog = await openCreateForm(user);

        // Kind is preset to the opening tab's kind — no manual selection needed.
        expect(withinDialog.getByLabelText('Kind')).toHaveValue('TENANT_INVITE');

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'New tenant welcome');
        await user.type(withinDialog.getByLabelText('Betreff'), 'Hi there');
        // fireEvent.change avoids userEvent's {{/}} key-sequence escaping for literal braces.
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Body {{email}}' } });

        await user.click(withinDialog.getByRole('button', { name: 'save' }));

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

    it('disables save until name, subject and body are filled', async () => {
        const user = userEvent.setup();
        renderDialog();

        const withinDialog = await openCreateForm(user);
        expect(withinDialog.getByRole('button', { name: 'save' })).toBeDisabled();

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'Name');
        await user.type(withinDialog.getByLabelText('Betreff'), 'Betreff');
        expect(withinDialog.getByRole('button', { name: 'save' })).toBeDisabled();

        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Inhalt' } });
        expect(withinDialog.getByRole('button', { name: 'save' })).toBeEnabled();
    });

    it('renders a live email-kit preview substituting known tokens with samples', async () => {
        const user = userEvent.setup();
        renderDialog();

        const withinDialog = await openCreateForm(user);
        await user.type(withinDialog.getByLabelText('Betreff'), 'Welcome to ORISO');
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), {
            target: { value: 'Hello {{firstName}},\n\nuse {{inviteLink}} to finish setup.' },
        });

        // Known tokens are substituted with the synthetic samples in the mail document…
        expect(previewSrcDoc()).toContain('Hello Lisa,');
        expect(previewSrcDoc()).toContain('https://beratung.example.org/einladung?token=1c9d');
        expect(previewSrcDoc()).toContain('Welcome to ORISO');
    });

    it('keeps unknown tokens visible in the preview instead of rendering blank', async () => {
        const user = userEvent.setup();
        renderDialog();

        const withinDialog = await openCreateForm(user);
        await user.type(withinDialog.getByLabelText('Betreff'), 'S');
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Hallo {{typo}}' } });

        expect(previewSrcDoc()).toContain('{{typo}}');
        expect(previewSrcDoc()).toContain('data-unknown-token');
    });

    it('inserts a picked token into the body and substitutes it live', async () => {
        const user = userEvent.setup();
        renderDialog();

        const withinDialog = await openCreateForm(user);
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Ihr Link: ' } });

        // Each field has its own picker; the body's is the second one.
        const pickers = withinDialog.getAllByRole('button', { name: 'Platzhalter einfügen' });
        await user.click(pickers[1]);
        await user.click(await screen.findByRole('menuitem', { name: /Einladungslink/ }));

        await waitFor(() => expect(withinDialog.getByLabelText('Inhalt')).toHaveValue('Ihr Link: {{inviteLink}}'));
        expect(previewSrcDoc()).toContain('https://beratung.example.org/einladung?token=1c9d');
    });

    it('no longer renders the hardcoded token code hint', async () => {
        const user = userEvent.setup();
        renderDialog();

        await openCreateForm(user);
        expect(screen.queryByText('Available placeholders:')).not.toBeInTheDocument();
    });

    it('opens a prefilled edit form on row double-click and updates the template', async () => {
        const user = userEvent.setup();
        mocks.updateInviteEmailTemplate.mockResolvedValue({ ...tenantTemplate, subject: 'Servus' });
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);

        const dialog = screen.getByRole('dialog');
        const withinDialog = within(dialog);
        expect(withinDialog.getByLabelText('Vorlagenname')).toHaveValue('Default tenant template');

        fireEvent.change(withinDialog.getByLabelText('Betreff'), { target: { value: 'Servus' } });
        await user.click(withinDialog.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(mocks.updateInviteEmailTemplate).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ subject: 'Servus' }),
            ),
        );
    });

    it('switches the loaded template via the split-button menu', async () => {
        const user = userEvent.setup();
        mocks.updateInviteEmailTemplate.mockResolvedValue(tenantTemplateShort);
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);

        const withinDialog = within(screen.getByRole('dialog'));
        await user.click(withinDialog.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Short tenant template$/ }));

        // The other template's stored values are loaded into the editor…
        expect(withinDialog.getByLabelText('Vorlagenname')).toHaveValue('Short tenant template');
        expect(withinDialog.getByLabelText('Betreff')).toHaveValue('Kurz');
        expect(withinDialog.getByLabelText('Inhalt')).toHaveValue('Link: {{inviteLink}}');

        // …and saving persists against THAT template's id.
        await user.click(withinDialog.getByRole('button', { name: 'save' }));
        await waitFor(() =>
            expect(mocks.updateInviteEmailTemplate).toHaveBeenCalledWith(
                4,
                expect.objectContaining({ subject: 'Kurz' }),
            ),
        );
    });

    it('starts a new template from an existing one via the split-button menu', async () => {
        const user = userEvent.setup();
        mocks.createInviteEmailTemplate.mockResolvedValue({ ...tenantTemplateShort, id: 9, name: 'Kopie' });
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);

        const withinDialog = within(screen.getByRole('dialog'));
        await user.click(withinDialog.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Neu aus „Short tenant template“/ }));

        // Contents are copied, but the name is empty — this will be a NEW template.
        expect(withinDialog.getByLabelText('Vorlagenname')).toHaveValue('');
        expect(withinDialog.getByLabelText('Betreff')).toHaveValue('Kurz');

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'Kopie');
        await user.click(withinDialog.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(mocks.createInviteEmailTemplate).toHaveBeenCalledTimes(1));
        expect(mocks.createInviteEmailTemplate).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Kopie', subject: 'Kurz', body: 'Link: {{inviteLink}}' }),
        );
        expect(mocks.updateInviteEmailTemplate).not.toHaveBeenCalled();
    });

    it('asks before a template switch discards unsaved edits', async () => {
        const user = userEvent.setup();
        const confirmSpy = vi.spyOn(window, 'confirm');
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);
        const withinDialog = within(screen.getByRole('dialog'));

        // Make the draft dirty, then decline the switch: the edits survive.
        fireEvent.change(withinDialog.getByLabelText('Betreff'), { target: { value: 'Edited subject' } });
        confirmSpy.mockReturnValue(false);
        await user.click(withinDialog.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Short tenant template$/ }));
        expect(confirmSpy).toHaveBeenCalled();
        expect(withinDialog.getByLabelText('Betreff')).toHaveValue('Edited subject');

        // Accepting the confirm loads the other template.
        confirmSpy.mockReturnValue(true);
        await user.click(withinDialog.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Short tenant template$/ }));
        expect(withinDialog.getByLabelText('Betreff')).toHaveValue('Kurz');

        confirmSpy.mockRestore();
    });

    it('switches without a confirm while the draft is clean', async () => {
        const user = userEvent.setup();
        const confirmSpy = vi.spyOn(window, 'confirm');
        renderDialog();

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);
        const withinDialog = within(screen.getByRole('dialog'));

        await user.click(withinDialog.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Short tenant template$/ }));

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(withinDialog.getByLabelText('Betreff')).toHaveValue('Kurz');
        confirmSpy.mockRestore();
    });

    it('keeps X closing the whole dialog while Abbrechen steps back to the list', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        renderDialog({ onClose });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);

        // Cancel: back to the template list, the dialog itself stays open.
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'cancel' }));
        expect(onClose).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));

        // X in the form view: closes the whole templates dialog (parity with
        // the pre-module form, where every dismiss gesture reached the parent).
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('asks before a dismiss gesture discards unsaved edits', async () => {
        const user = userEvent.setup();
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const onClose = vi.fn();
        renderDialog({ onClose });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));
        fireEvent.doubleClick(screen.getAllByTestId('template-row')[0]);
        const withinDialog = within(screen.getByRole('dialog'));
        fireEvent.change(withinDialog.getByLabelText('Betreff'), { target: { value: 'Edited subject' } });

        await user.click(withinDialog.getByRole('button', { name: 'Close' }));
        expect(confirmSpy).toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();

        confirmSpy.mockReturnValue(true);
        await user.click(withinDialog.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    it('describes the disabled save button with the incomplete hint', async () => {
        const user = userEvent.setup();
        renderDialog();

        const withinDialog = await openCreateForm(user);
        expect(withinDialog.getByRole('button', { name: 'save' })).toHaveAccessibleDescription(
            'Vorlagenname, Betreff und Inhalt ausfüllen, um zu speichern.',
        );

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'Name');
        await user.type(withinDialog.getByLabelText('Betreff'), 'Betreff');
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Inhalt' } });
        expect(withinDialog.getByRole('button', { name: 'save' })).not.toHaveAccessibleDescription();
    });

    it('prefills the create deep link from initialTemplateId ("Neu aus …")', async () => {
        renderDialog({ initialView: 'create', initialTemplateId: 4 });

        // The list dialog shows first while templates load, then the form
        // replaces it — query globally instead of pinning the first dialog node.
        const subject = await screen.findByLabelText('Betreff');
        await waitFor(() => expect(subject).toHaveValue('Kurz'));
        expect(screen.getByLabelText('Inhalt')).toHaveValue('Link: {{inviteLink}}');
        // Copied contents, but a NEW template: the name stays empty.
        expect(screen.getByLabelText('Vorlagenname')).toHaveValue('');
    });

    it('selects a template when its name is clicked in picker mode', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));

        await user.click(screen.getByRole('button', { name: 'Default tenant template' }));

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('leaves templates of another kind or inactive ones unselectable', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));

        // Inactive COUNSELLOR_INVITE template in a TENANT_INVITE tab: plain text, and a
        // row click must not hand it to the composer either.
        expect(screen.queryByRole('button', { name: 'Default counsellor template' })).not.toBeInTheDocument();
        await user.click(screen.getAllByTestId('template-row')[2]);

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('keeps the edit button working in picker mode instead of selecting', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        renderDialog({ onSelect });

        await waitFor(() => expect(screen.getAllByTestId('template-row')).toHaveLength(3));

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

        const withinDialog = await openCreateForm(user);

        await user.type(withinDialog.getByLabelText('Vorlagenname'), 'Broken template');
        await user.type(withinDialog.getByLabelText('Betreff'), 'Subject');
        fireEvent.change(withinDialog.getByLabelText('Inhalt'), { target: { value: 'Body' } });

        await user.click(withinDialog.getByRole('button', { name: 'save' }));

        expect(await screen.findByText('Could not create template')).toBeInTheDocument();
        expect(screen.queryByText('CATCH_ALL')).not.toBeInTheDocument();
    });
});

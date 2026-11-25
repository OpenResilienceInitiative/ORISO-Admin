import '@ant-design/v5-patch-for-react-19';
import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../i18n';
import type { TopicCatalogueDto } from '../../types/TopicCatalogue';
import { TopicCatalogueDialog } from '.';

vi.setConfig({ testTimeout: 60_000 });

const OWN = 'data:image/png;base64,iVBORw0KGgo=';

/** What GET /topicadmin/catalogue answers, trimmed to two categories and three topics. */
const catalogue = (): TopicCatalogueDto => ({
    groups: [
        {
            id: 1,
            name: { de: 'Alter', fr: 'Vieillesse' },
            icon: '/service/topic/public/icons/cat-02.png',
            topicIds: [15],
        },
        { id: 2, name: { de: 'Krisen' }, icon: '/service/topic/public/icons/cat-05.png', topicIds: [14, 15] },
    ],
    topics: [
        {
            id: 14,
            slug: 'debt',
            internalIdentifier: 'debt',
            status: 'ACTIVE',
            name: { de: 'Schulden', fr: 'Dettes' },
            description: { de: 'Hilfe bei Schulden' },
            icon: OWN,
            titles: { short: { de: 'Schulden' } },
        },
        {
            id: 15,
            slug: 'life-in-old-age',
            internalIdentifier: 'life-in-old-age',
            status: 'ACTIVE',
            name: { de: 'Leben im Alter' },
            description: { de: 'Alter' },
            icon: '/service/topic/public/icons/t-02-leben-im-alter.png',
        },
        {
            id: 20,
            slug: 'migration',
            internalIdentifier: 'migration',
            status: 'INACTIVE',
            name: { de: 'Migration' },
            description: { de: 'Ankommen' },
            icon: null,
        },
    ],
});

const LANGUAGES = [
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Französisch' },
];

const open = (overrides: Partial<React.ComponentProps<typeof TopicCatalogueDialog>> = {}) => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
        <TopicCatalogueDialog
            catalogue={catalogue()}
            languages={LANGUAGES}
            onSave={onSave}
            onClose={onClose}
            {...overrides}
        />,
    );
    return { onSave, onClose, u: userEvent.setup({ delay: null }) };
};

const pool = () => screen.getByRole('list', { name: 'Alle Themen' });
const category = (name: string) => screen.getByRole('region', { name: `Kategorie ${name}` });
const save = async (u: ReturnType<typeof userEvent.setup>) =>
    u.click(screen.getByRole('button', { name: 'Speichern' }));
const savedBody = (onSave: ReturnType<typeof vi.fn>) => onSave.mock.calls[0][0] as TopicCatalogueDto;

/** jsdom has no DataTransfer; the dialog only needs the event to happen. */
const drag = (from: HTMLElement, to: HTMLElement) => {
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(from, { dataTransfer });
    fireEvent.dragOver(to, { dataTransfer });
    const drop = createEvent.drop(to, { dataTransfer });
    fireEvent(to, drop);
    fireEvent.dragEnd(from, { dataTransfer });
};

beforeEach(async () => {
    await i18n.changeLanguage('de');
});

describe('TopicCatalogueDialog', () => {
    it('lists every topic once in the pool with how many categories show it', () => {
        open();

        const tiles = within(pool()).getAllByRole('listitem');
        expect(tiles).toHaveLength(3);
        expect(within(pool()).getByText('Leben im Alter').closest('li')).toHaveTextContent('2×');
        expect(within(pool()).getByText('Migration').closest('li')).toHaveTextContent('0×');
    });

    it('shows the neutral placeholder for a topic without a picture', () => {
        open();

        const migration = within(pool()).getByText('Migration').closest('li') as HTMLElement;
        expect(within(migration).getByTestId('icon-placeholder')).toBeInTheDocument();
    });

    it('adds a topic to a category by dragging it there', async () => {
        const { onSave, u } = open();

        drag(within(pool()).getByText('Migration').closest('li') as HTMLElement, category('Alter'));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups[0].topicIds).toEqual([15, 20]);
    });

    it('moves a topic forward within a category to just before the row it is dropped on', async () => {
        const { onSave, u } = open();
        drag(within(pool()).getByText('Migration').closest('li') as HTMLElement, category('Krisen'));
        const row = (name: string) => within(category('Krisen')).getByText(name).closest('li') as HTMLElement;

        drag(row('Schulden'), row('Migration'));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups[1].topicIds).toEqual([15, 14, 20]);
    });

    it('reorders topics within a category without a mouse', async () => {
        const { onSave, u } = open();
        const krisen = within(category('Krisen'));

        expect(krisen.getByRole('button', { name: '„Schulden“ nach oben' })).toBeDisabled();
        await u.click(krisen.getByRole('button', { name: '„Schulden“ nach unten' }));
        expect(krisen.getByRole('button', { name: '„Schulden“ nach unten' })).toBeDisabled();
        await u.click(krisen.getByRole('button', { name: '„Schulden“ nach oben' }));
        await u.click(krisen.getByRole('button', { name: '„Leben im Alter“ nach oben' }));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups[1].topicIds).toEqual([15, 14]);
    });

    it('adds a topic to a category without a mouse, from the open topic', async () => {
        const { onSave, u } = open();

        await u.click(within(pool()).getByRole('button', { name: /Migration/ }));
        await u.click(screen.getByRole('checkbox', { name: 'Krisen' }));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups[1].topicIds).toEqual([14, 15, 20]);
    });

    it('renames a category in the chosen language and keeps the others', async () => {
        const { onSave, u } = open();

        await u.click(screen.getByRole('button', { name: /Französisch/ }));
        const name = within(category('Vieillesse')).getByRole('textbox', { name: 'Name der Kategorie' });
        await u.clear(name);
        await u.type(name, 'Âge');
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups[0].name).toEqual({ de: 'Alter', fr: 'Âge' });
    });

    it('moves a category up', async () => {
        const { onSave, u } = open();

        await u.click(within(category('Krisen')).getByRole('button', { name: 'Kategorie nach oben' }));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups.map((group) => group.id)).toEqual([2, 1]);
    });

    it('creates a new category without an id', async () => {
        const { onSave, u } = open();

        await u.click(screen.getAllByRole('button', { name: 'Neue Kategorie' })[0]);
        await u.type(screen.getAllByRole('textbox', { name: 'Name der Kategorie' }).at(-1) as HTMLElement, 'Wohnen');
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).groups.at(-1)).toEqual({ name: { de: 'Wohnen' }, icon: '', topicIds: [] });
    });

    it('saves an edited translation merged into the stored topic, and only that topic', async () => {
        const { onSave, u } = open();

        await u.click(screen.getByRole('button', { name: /Französisch/ }));
        await u.click(within(pool()).getByRole('button', { name: /Dettes/ }));
        await u.type(screen.getByRole('textbox', { name: 'Beschreibung' }), 'Aide');
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).topics).toEqual([
            {
                ...catalogue().topics[0],
                description: { de: 'Hilfe bei Schulden', fr: 'Aide' },
            },
        ]);
    });

    it('removes a topic picture: the placeholder shows and the save restores the default', async () => {
        const { onSave, u } = open();

        await u.click(within(pool()).getByRole('button', { name: /Schulden/ }));
        await u.click(screen.getByRole('button', { name: 'Bild für „Schulden“ entfernen' }));
        expect(screen.getAllByTestId('icon-placeholder').length).toBeGreaterThan(1);
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedBody(onSave).topics[0]).toMatchObject({ id: 14, icon: '' });
    });

    it('adds a new topic with a temporary negative id and places it', async () => {
        const { onSave, u } = open();

        await u.click(screen.getByRole('button', { name: 'Neues Thema' }));
        await u.type(screen.getByRole('textbox', { name: 'Name' }), 'Wohnen & Miete');
        await u.type(screen.getByRole('textbox', { name: 'Beschreibung' }), 'Hilfe bei Mietfragen');
        await u.click(screen.getByRole('checkbox', { name: 'Krisen' }));
        await save(u);

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const body = savedBody(onSave);
        const created = body.topics.find((topic) => topic.id < 0);
        expect(created).toMatchObject({
            name: { de: 'Wohnen & Miete' },
            description: { de: 'Hilfe bei Mietfragen' },
            status: 'ACTIVE',
        });
        expect(body.groups[1].topicIds).toEqual([14, 15, created?.id]);
    });

    it('marks what is missing in a language', async () => {
        const { u } = open();

        await u.click(screen.getByRole('button', { name: /Französisch/ }));

        expect(within(category('Krisen')).getByText('Übersetzung fehlt')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Französisch/ })).toHaveTextContent(/\d/);
    });

    it('closes with the X without saving', async () => {
        const { onSave, onClose, u } = open();

        await u.click(screen.getByRole('button', { name: /close|schließen/i }));

        expect(onClose).toHaveBeenCalled();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('freezes the draft and stays open while a save is running', async () => {
        let finish: () => void = () => undefined;
        const pending = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const { onClose, u } = open({ onSave: vi.fn().mockReturnValue(pending) });

        await u.click(within(category('Krisen')).getByRole('button', { name: 'Kategorie nach oben' }));
        await save(u);

        expect(within(category('Alter')).getByRole('textbox', { name: 'Name der Kategorie' })).toBeDisabled();
        screen.getAllByRole('button', { name: 'Neue Kategorie' }).forEach((button) => expect(button).toBeDisabled());
        expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeDisabled();
        await u.click(screen.getByRole('button', { name: /close|schließen/i }));
        expect(onClose).not.toHaveBeenCalled();

        finish();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled());
    });

    it('waits for a picture that is still being read before it lets the catalogue be saved', async () => {
        let finishRead: () => void = () => undefined;
        const read = vi
            .spyOn(FileReader.prototype, 'readAsDataURL')
            .mockImplementation(function readLater(this: FileReader) {
                finishRead = () => {
                    Object.defineProperty(this, 'result', { value: OWN, configurable: true });
                    this.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>);
                };
            });
        const { onSave, u } = open();

        await u.click(within(category('Krisen')).getByRole('button', { name: 'Kategorie nach oben' }));
        const picture = new File(['png'], 'krise.png', { type: 'image/png' });
        const field = document.querySelector('input[type="file"]') as HTMLInputElement;
        await u.upload(field, picture);

        expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
        await save(u);
        expect(onSave).not.toHaveBeenCalled();

        finishRead();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled());
        read.mockRestore();
    });

    it('refuses an SVG picture that carries a script', async () => {
        const { onSave, u } = open();
        const unsafe = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'x.svg', {
            type: 'image/svg+xml',
        });
        const field = document.querySelector('input[type="file"]') as HTMLInputElement;
        await u.upload(field, unsafe);

        expect(await screen.findByText(/Das Bild passt nicht/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('keeps the dialog open with a message when saving fails', async () => {
        const { onClose, u } = open({ onSave: vi.fn().mockRejectedValue(new Error('500')) });

        await u.click(within(category('Krisen')).getByRole('button', { name: 'Kategorie nach oben' }));
        await save(u);

        expect(await screen.findByRole('alert')).toHaveTextContent('nicht gespeichert');
        expect(onClose).not.toHaveBeenCalled();
    });

    describe('AI translation of empty languages (Frank, 2026-11-24)', () => {
        it('has no AI button without a translator', () => {
            open();
            expect(screen.queryByTestId('topic-dialog-translate')).not.toBeInTheDocument();
        });

        it('sends only the texts French lacks and saves the answers', async () => {
            const onTranslate = vi.fn(async (request: { texts: Record<string, string> }) => ({
                provider: 'mistral',
                model: 'mistral-small-latest',
                translations: {
                    fr: Object.fromEntries(
                        Object.entries(request.texts).map(([key, value]) => [key, `<p>FR ${value}</p>`]),
                    ),
                },
            }));
            const { onSave, u } = open({ onTranslate });

            await u.click(within(screen.getByTestId('topic-dialog-translate')).getByRole('button'));

            await waitFor(() => expect(onTranslate).toHaveBeenCalledTimes(1));
            expect(onTranslate.mock.calls[0][0]).toEqual({
                sourceLang: 'de',
                targetLangs: ['fr'],
                texts: {
                    'topic:14:description': 'Hilfe bei Schulden',
                    'topic:15:name': 'Leben im Alter',
                    'topic:15:description': 'Alter',
                    'topic:20:name': 'Migration',
                    'topic:20:description': 'Ankommen',
                    'group:g2': 'Krisen',
                },
            });
            await save(u);
            await waitFor(() => expect(onSave).toHaveBeenCalled());
            const body = savedBody(onSave);
            const debt = body.topics.find((topic) => topic.id === 14);
            expect(debt?.name).toEqual({ de: 'Schulden', fr: 'Dettes' });
            expect(debt?.description).toEqual({ de: 'Hilfe bei Schulden', fr: 'FR Hilfe bei Schulden' });
            expect(body.groups.find((group) => group.id === 2)?.name).toEqual({ de: 'Krisen', fr: 'FR Krisen' });
            expect(body.groups.find((group) => group.id === 1)?.name).toEqual({ de: 'Alter', fr: 'Vieillesse' });
        });

        it('keeps the dialog usable and says why when the translation fails', async () => {
            const onTranslate = vi.fn().mockRejectedValue(new Error('down'));
            const { onSave, u } = open({ onTranslate });

            await u.click(within(screen.getByTestId('topic-dialog-translate')).getByRole('button'));

            await waitFor(() => expect(onTranslate).toHaveBeenCalled());
            expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
            expect(onSave).not.toHaveBeenCalled();
        });
    });
});

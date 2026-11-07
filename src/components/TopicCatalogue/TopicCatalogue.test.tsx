import '@ant-design/v5-patch-for-react-19';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../i18n';
import { TopicCatalogue, type CatalogueLanguage, type CatalogueTopic } from './index';
import type { TopicLayout } from './topicLayout';

// jsdom is slow at role queries on a page of this size; the tests below query by label and text.
vi.setConfig({ testTimeout: 60_000 });

const topics: CatalogueTopic[] = [
    { id: 1, name: 'Sucht', description: 'Suchtberatung', active: true },
    { id: 2, name: 'Schulden', description: 'Schuldnerberatung', active: true },
    { id: 3, name: 'Migration', description: 'Migrationsberatung', active: false },
];
const layout: TopicLayout = [
    { id: 'a', name: 'Allgemein', topicIds: [1, 2] },
    { id: 'b', name: 'Weitere', topicIds: [3] },
    { id: 'c', name: 'Leer', topicIds: [] },
];

const setup = (props: Partial<Parameters<typeof TopicCatalogue>[0]> = {}) => {
    const onSaveLayout = vi.fn().mockResolvedValue(undefined);
    const onToggleActive = vi.fn();
    render(
        <TopicCatalogue
            topics={topics}
            layout={layout}
            onSaveLayout={onSaveLayout}
            onToggleActive={onToggleActive}
            {...props}
        />,
    );
    return { onSaveLayout, onToggleActive };
};

const languages: CatalogueLanguage[] = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'Englisch' },
    { code: 'fr', label: 'Französisch' },
];

const user = () => userEvent.setup({ delay: null });
const label = (text: string | RegExp) => screen.getByLabelText(text);
const textButton = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;
const groupItems = (groupId: string) =>
    Array.from(document.querySelectorAll(`[data-group-id="${groupId}"] li[data-topic-id]`)).map(
        (item) => item.textContent ?? '',
    );
const poolRow = (id: number) => document.querySelector(`li[data-pool-topic-id="${id}"]`) as HTMLElement;
const placement = (groupId: string, id: number) =>
    document.querySelector(`[data-group-id="${groupId}"] li[data-topic-id="${id}"]`) as HTMLElement;
const section = (groupId: string) => document.querySelector(`[data-group-id="${groupId}"]`) as HTMLElement;
const handle = (name: string) => label(`„${name}“ verschieben`);
const status = () => document.querySelector('[aria-live="polite"]') as HTMLElement;

beforeEach(async () => {
    await i18n.changeLanguage('de');
});

describe('TopicCatalogue view', () => {
    it('shows one panel per category with its topics in order, without any numbers for the order', () => {
        setup();
        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
            'Allgemein',
            'Weitere',
            'Leer',
        ]);
        expect(groupItems('a')[0]).toContain('Sucht');
        expect(groupItems('a')[1]).toContain('Schulden');
        expect(screen.getByText('Ausgeblendet')).toBeInTheDocument();
    });

    it('switches a topic visible or hidden through the switch', async () => {
        const { onToggleActive } = setup();
        await user().click(label('„Migration“ in der Registrierung anzeigen'));
        expect(onToggleActive).toHaveBeenCalledWith(3, true);
    });

    it('has no edit mode while the server cannot keep a layout', () => {
        setup({ onSaveLayout: undefined });
        expect(screen.queryByLabelText('Bearbeiten')).toBeNull();
    });

    it('locks everything and names the reason when the viewer may only read', () => {
        setup({ readOnlyReason: 'Nur Plattform-Admins.' });
        expect(screen.getByText('Nur Plattform-Admins.')).toBeInTheDocument();
        expect(screen.queryByLabelText('Bearbeiten')).toBeNull();
        screen.getAllByRole('switch').forEach((toggle) => expect(toggle).toBeDisabled());
    });

    it('offers a retry when loading failed', async () => {
        const onRetry = vi.fn();
        setup({ topics: [], layout: [], loadError: true, onRetry });
        expect(screen.getByRole('alert')).toHaveTextContent('nicht geladen werden');
        await user().click(textButton('Erneut versuchen'));
        expect(onRetry).toHaveBeenCalled();
    });

    it('says so when there are no topics', () => {
        setup({ topics: [], layout: [] });
        expect(screen.getByText('Es gibt noch keine Themen.')).toBeInTheDocument();
    });
});

describe('TopicCatalogue view (more)', () => {
    it('collapses and expands a category', async () => {
        setup();
        const u = user();
        await u.click(label('„Allgemein“ zuklappen'));
        expect(groupItems('a')).toHaveLength(0);
        await u.click(label('„Allgemein“ aufklappen'));
        expect(groupItems('a')).toHaveLength(2);
    });

    it('shows a language bar only with more than one language', () => {
        setup();
        expect(document.querySelector('[data-lang]')).toBeNull();
    });
});

describe('TopicCatalogue edit mode', () => {
    const startEditing = async () => user().click(label('Bearbeiten'));

    it('shows categories on the left and all topics on the right', async () => {
        setup();
        await startEditing();
        expect(screen.getByRole('heading', { name: 'Kategorien' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Themen (3)' })).toBeInTheDocument();
        expect(poolRow(1)).toHaveTextContent('In 1 Kategorie');
        expect(screen.queryAllByRole('switch')).toHaveLength(0);
    });

    it('keeps Save disabled until something changed, and Cancel throws the draft away', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await startEditing();
        expect(textButton('Speichern')).toBeDisabled();

        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        expect(textButton('Speichern')).toBeEnabled();

        await u.click(textButton('Abbrechen'));
        expect(onSaveLayout).not.toHaveBeenCalled();
        expect(groupItems('a')[0]).toContain('Sucht');
    });

    it('moves with the arrow keys, announces it, and keeps focus on the handle', async () => {
        setup();
        const u = user();
        await startEditing();
        handle('Sucht').focus();

        await u.keyboard('{ArrowDown}');
        expect(status()).toHaveTextContent('„Sucht“ steht jetzt auf Platz 2 von 2 in „Allgemein“.');
        expect(handle('Sucht')).toHaveFocus();

        await u.keyboard('{ArrowRight}');
        expect(status()).toHaveTextContent('in „Weitere“');
        expect(groupItems('b').some((text) => text.includes('Sucht'))).toBe(true);
        expect(handle('Sucht')).toHaveFocus();

        await u.keyboard('{ArrowUp}');
        await waitFor(() => expect(status()).toHaveTextContent('Platz 1 von 2'));
    });

    it('says when a topic cannot move further', async () => {
        setup();
        const u = user();
        await startEditing();
        handle('Sucht').focus();
        await u.keyboard('{ArrowUp}');
        expect(status()).toHaveTextContent('kann nicht weiter in diese Richtung');
        expect(textButton('Speichern')).toBeDisabled();
    });

    it('saves the whole change in one call and leaves the edit mode', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await startEditing();
        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        await u.click(textButton('Speichern'));

        await waitFor(() => expect(onSaveLayout).toHaveBeenCalledTimes(1));
        expect(onSaveLayout).toHaveBeenCalledWith({
            layout: [
                { id: 'a', name: 'Allgemein', topicIds: [2, 1] },
                { id: 'b', name: 'Weitere', topicIds: [3] },
                { id: 'c', name: 'Leer', topicIds: [] },
            ],
            topics: [],
            iconFiles: {},
            groupIconFiles: {},
        });
        await waitFor(() => expect(screen.getByLabelText('Bearbeiten')).toBeInTheDocument());
    });

    it('stays in edit mode with the draft and an error when the save fails', async () => {
        const onSaveLayout = vi.fn().mockRejectedValue(new Error('500'));
        setup({ onSaveLayout });
        const u = user();
        await startEditing();
        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        await u.click(textButton('Speichern'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Das Speichern hat nicht geklappt');
        expect(textButton('Speichern')).toBeEnabled();
        expect(groupItems('a')[1]).toContain('Sucht');
    });

    it('reorders and moves a placement by drag and drop, also into an empty category', () => {
        setup();
        fireEvent.click(label('Bearbeiten'));

        fireEvent.dragStart(placement('a', 2));
        fireEvent.dragOver(placement('a', 1));
        fireEvent.drop(placement('a', 1));
        expect(groupItems('a')[0]).toContain('Schulden');

        fireEvent.dragStart(placement('a', 1));
        fireEvent.dragOver(section('c'));
        fireEvent.drop(section('c'));
        expect(groupItems('c')[0]).toContain('Sucht');
        expect(groupItems('a')).toHaveLength(1);
    });

    it('copies a topic from the topic list into a category by drag and drop', () => {
        setup();
        fireEvent.click(label('Bearbeiten'));

        fireEvent.dragStart(poolRow(1));
        fireEvent.dragOver(section('c'));
        fireEvent.drop(section('c'));

        expect(groupItems('c')[0]).toContain('Sucht');
        expect(groupItems('a')[0]).toContain('Sucht');
        expect(poolRow(1)).toHaveTextContent('In 2 Kategorien');
    });

    it('adds a topic to a second category through the select, and refuses a duplicate in one category', async () => {
        setup();
        const u = user();
        await startEditing();
        await u.selectOptions(label('„Sucht“ zu einer Kategorie hinzufügen'), 'b');
        expect(groupItems('b').some((text) => text.includes('Sucht'))).toBe(true);
        expect(groupItems('a')[0]).toContain('Sucht');
        expect(status()).toHaveTextContent('„Sucht“ zu „Weitere“ hinzugefügt');

        fireEvent.dragStart(poolRow(1));
        fireEvent.dragOver(section('b'));
        fireEvent.drop(section('b'));
        expect(groupItems('b').filter((text) => text.includes('Sucht'))).toHaveLength(1);
        expect(status()).toHaveTextContent('„Sucht“ ist schon in „Weitere“.');
    });

    it('takes a topic out of one category only; it stays in the topic list', async () => {
        setup();
        const u = user();
        await startEditing();
        await u.click(label('„Sucht“ aus „Allgemein“ entfernen'));
        expect(groupItems('a')).toHaveLength(1);
        expect(poolRow(1)).toHaveTextContent('In keiner Kategorie');
    });

    it('adds a category, renames one, and removes one without losing its topics', async () => {
        setup();
        const u = user();
        await startEditing();
        await u.click(textButton('Kategorie hinzufügen'));
        expect(screen.getAllByLabelText('Name der Kategorie')).toHaveLength(4);

        await u.click(label('Kategorie „Allgemein“ entfernen'));
        expect(screen.getAllByLabelText('Name der Kategorie')).toHaveLength(3);
        expect(poolRow(1)).toHaveTextContent('In keiner Kategorie');

        const input = screen.getAllByLabelText('Name der Kategorie')[0];
        await u.clear(input);
        expect(textButton('Speichern')).toBeDisabled();
        await u.type(input, 'Grundlagen');
        expect(textButton('Speichern')).toBeEnabled();
    });
});

describe('TopicCatalogue icons', () => {
    const svg = () => new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'sucht.svg', { type: 'image/svg+xml' });

    it('uploads an SVG icon, shows it at once and hands the file to the save', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        const file = svg();
        await u.upload(screen.getByTestId('icon-input-Sucht'), file);

        expect(await screen.findByLabelText('Icon von „Sucht“ ersetzen')).toBeInTheDocument();
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        const change = onSaveLayout.mock.calls[0][0];
        expect(change.iconFiles).toEqual({ 1: file });
        expect(change.topics).toHaveLength(1);
        expect(change.topics[0].icon).toMatch(/^data:image\/svg\+xml/);
    });

    it('removes an icon again', async () => {
        const { onSaveLayout } = setup({
            topics: topics.map((t) => (t.id === 1 ? { ...t, icon: 'data:image/png;base64,AA==' } : t)),
        });
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(label('Icon von „Sucht“ entfernen'));
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        expect(onSaveLayout.mock.calls[0][0].iconFiles).toEqual({ 1: null });
    });

    it('lets a category have a picture of its own, handed to the save next to the layout', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        const file = svg();
        await u.upload(screen.getByTestId('icon-input-Allgemein'), file);

        expect(await screen.findByLabelText('Icon von „Allgemein“ ersetzen')).toBeInTheDocument();
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        const change = onSaveLayout.mock.calls[0][0];
        expect(change.groupIconFiles).toEqual({ a: file });
        expect(change.iconFiles).toEqual({});
        expect(change.layout.find((group: { id: string }) => group.id === 'a')?.icon).toMatch(/^data:image\/svg\+xml/);
    });

    it('removes a category picture again and shows none in view mode when there is none', async () => {
        const { onSaveLayout } = setup({
            layout: layout.map((group) =>
                group.id === 'a' ? { ...group, icon: 'data:image/png;base64,AA==' } : group,
            ),
        });
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(label('Icon von „Allgemein“ entfernen'));
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        expect(onSaveLayout.mock.calls[0][0].groupIconFiles).toEqual({ a: null });
    });

    it('refuses other file types and files over 100 KB', async () => {
        setup();
        const u = userEvent.setup({ delay: null, applyAccept: false });
        await u.click(label('Bearbeiten'));
        const input = screen.getByTestId('icon-input-Sucht');
        await u.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('SVG- oder PNG-Datei');

        const big = new File([new Uint8Array(101 * 1024)], 'big.png', { type: 'image/png' });
        await u.upload(input, big);
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('größer als 100 KB'));
        expect(textButton('Speichern')).toBeDisabled();
    });
});

describe('TopicCatalogue languages', () => {
    const translated = topics.map((topic) => (topic.id === 1 ? { ...topic, names: { en: 'Addiction' } } : topic));
    const langButton = (code: string) => document.querySelector(`[data-lang="${code}"]`) as HTMLButtonElement;

    it('shows a bar with the number of missing texts per language', () => {
        setup({ topics: translated, languages });
        expect(langButton('de')).toHaveTextContent('Deutsch');
        expect(langButton('de').querySelector('[title]')).toBeNull();
        // en: 2 topic names + 3 categories + 3 descriptions - 1 given name = 8
        expect(langButton('en')).toHaveTextContent('8');
        expect(langButton('fr')).toHaveTextContent('9');
    });

    it('switches the whole view; texts without a translation are marked and show the German text', async () => {
        setup({ topics: translated, languages });
        await user().click(langButton('en'));
        expect(groupItems('a')[0]).toContain('Addiction');
        expect(groupItems('a')[1]).toContain('Schulden');
        expect(screen.getAllByRole('img', { name: 'Noch nicht übersetzt' }).length).toBeGreaterThan(0);
    });

    it('edits a translated topic name in edit mode and hands it to the save', async () => {
        const { onSaveLayout } = setup({ topics: translated, languages });
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(langButton('en'));
        const input = label('Name von „Schulden“ auf Englisch');
        expect(input).toHaveValue('');
        await u.type(input, 'Debt');
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        const change = onSaveLayout.mock.calls[0][0];
        expect(change.topics).toEqual([expect.objectContaining({ id: 2, names: { en: 'Debt' } })]);
    });

    it('translates the gaps with AI, marks them and keeps what a person wrote', async () => {
        const onTranslate = vi.fn().mockResolvedValue({
            en: { 'topic:1': 'WRONG', 'topic:2': 'Debt', 'group:a': 'General' },
            fr: { 'topic:1': 'Dépendance' },
        });
        const { onSaveLayout } = setup({ topics: translated, languages, onTranslate });
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(textButton('Fehlende Texte mit KI übersetzen'));

        await waitFor(() => expect(status()).toHaveTextContent('Texte übersetzt'));
        expect(onTranslate).toHaveBeenCalledWith(
            expect.objectContaining({ sourceLang: 'de', targetLangs: ['en', 'fr'] }),
        );
        await u.click(langButton('en'));
        expect(screen.getAllByRole('img', { name: 'Maschinell übersetzt, noch nicht geprüft' }).length).toBeGreaterThan(
            0,
        );
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        const change = onSaveLayout.mock.calls[0][0];
        expect(change.topics.find((t: CatalogueTopic) => t.id === 1).names).toEqual({
            en: 'Addiction',
            fr: 'Dépendance',
        });
    });

    it('says so when the translation fails', async () => {
        const onTranslate = vi.fn().mockRejectedValue({ errorCode: 'TRANSLATION_NOT_CONFIGURED' });
        setup({ languages, onTranslate });
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(textButton('Fehlende Texte mit KI übersetzen'));
        expect(await screen.findByRole('alert')).toHaveTextContent('noch nicht eingerichtet');
    });

    it('has no AI button without a translation service', async () => {
        setup({ languages });
        await user().click(label('Bearbeiten'));
        expect(screen.queryByText('Fehlende Texte mit KI übersetzen')).toBeNull();
    });
});

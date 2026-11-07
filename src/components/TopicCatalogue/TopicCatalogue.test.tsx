import '@ant-design/v5-patch-for-react-19';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../i18n';
import { TopicCatalogue, type CatalogueTopic } from './index';
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

const user = () => userEvent.setup({ delay: null });
const label = (text: string | RegExp) => screen.getByLabelText(text);
const textButton = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;
const groupItems = (groupId: string) =>
    Array.from(document.querySelectorAll(`[data-group-id="${groupId}"] li[data-topic-id]`)).map(
        (item) => item.textContent ?? '',
    );
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

describe('TopicCatalogue edit mode', () => {
    const startEditing = async () => user().click(label('Bearbeiten'));

    it('keeps Save disabled until something changed, and Cancel throws the draft away', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await u.click(label('Bearbeiten'));
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
        await u.click(label('Bearbeiten'));
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
        await u.click(label('Bearbeiten'));
        handle('Sucht').focus();
        await u.keyboard('{ArrowUp}');
        expect(status()).toHaveTextContent('kann nicht weiter in diese Richtung');
        expect(textButton('Speichern')).toBeDisabled();
    });

    it('saves the whole new layout in one call and leaves the edit mode', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        await u.click(textButton('Speichern'));

        await waitFor(() => expect(onSaveLayout).toHaveBeenCalledTimes(1));
        expect(onSaveLayout).toHaveBeenCalledWith([
            { id: 'a', name: 'Allgemein', topicIds: [2, 1] },
            { id: 'b', name: 'Weitere', topicIds: [3] },
            { id: 'c', name: 'Leer', topicIds: [] },
        ]);
        await waitFor(() => expect(screen.getByLabelText('Bearbeiten')).toBeInTheDocument());
    });

    it('stays in edit mode with the draft and an error when the save fails', async () => {
        const onSaveLayout = vi.fn().mockRejectedValue(new Error('500'));
        setup({ onSaveLayout });
        const u = user();
        await u.click(label('Bearbeiten'));
        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        await u.click(textButton('Speichern'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Das Speichern hat nicht geklappt');
        expect(textButton('Speichern')).toBeEnabled();
        expect(groupItems('a')[1]).toContain('Sucht');
    });

    it('moves a topic by drag and drop, also into an empty category', () => {
        setup();
        fireEvent.click(label('Bearbeiten'));
        const row = (id: number) => document.querySelector(`li[data-topic-id="${id}"]`) as HTMLElement;

        fireEvent.dragStart(row(2));
        fireEvent.dragOver(row(1));
        fireEvent.drop(row(1));
        expect(groupItems('a')[0]).toContain('Schulden');

        const emptyList = document.querySelector('[data-group-id="c"] ul') as HTMLElement;
        fireEvent.dragStart(row(1));
        fireEvent.dragOver(emptyList);
        fireEvent.drop(emptyList);
        expect(groupItems('c')[0]).toContain('Sucht');
    });

    it('drags a topic down inside its category and saves that order', async () => {
        const { onSaveLayout } = setup();
        fireEvent.click(label('Bearbeiten'));
        const row = (id: number) => document.querySelector(`li[data-topic-id="${id}"]`) as HTMLElement;
        // jsdom has no layout: give the target row a box so the lower half can be hit.
        vi.spyOn(row(2), 'getBoundingClientRect').mockReturnValue({ top: 100, height: 40 } as DOMRect);

        fireEvent.dragStart(row(1));
        // jsdom's drag events carry no clientY: set it on the event itself.
        const over = createEvent.dragOver(row(2));
        Object.defineProperty(over, 'clientY', { value: 130 });
        fireEvent(row(2), over);
        fireEvent.drop(row(2));
        expect(groupItems('a')).toEqual([expect.stringContaining('Schulden'), expect.stringContaining('Sucht')]);

        fireEvent.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        expect(onSaveLayout.mock.calls[0][0][0].topicIds).toEqual([2, 1]);
    });

    it('clears an old save error as soon as the draft changes again', async () => {
        const onSaveLayout = vi.fn().mockRejectedValue(new Error('500'));
        setup({ onSaveLayout });
        const u = user();
        await u.click(label('Bearbeiten'));
        handle('Sucht').focus();
        await u.keyboard('{ArrowDown}');
        await u.click(textButton('Speichern'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Das Speichern hat nicht geklappt');

        handle('Sucht').focus();
        await u.keyboard('{ArrowUp}');
        expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    });

    it('moves a topic through the category select (touch)', async () => {
        setup();
        await startEditing();
        await user().selectOptions(label('Kategorie von „Sucht“'), 'b');
        expect(groupItems('b').some((text) => text.includes('Sucht'))).toBe(true);
    });

    it('hands focus back to the moved topic row after the category select', async () => {
        setup();
        await startEditing();
        await user().selectOptions(label('Kategorie von „Sucht“'), 'b');
        await waitFor(() => expect(handle('Sucht')).toHaveFocus());
    });

    it('trims category names once, when saving', async () => {
        const { onSaveLayout } = setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        const input = screen.getAllByLabelText('Name der Kategorie')[0];
        await u.clear(input);
        await u.type(input, '  Grundlagen ');
        await u.click(textButton('Speichern'));
        await waitFor(() => expect(onSaveLayout).toHaveBeenCalled());
        expect(onSaveLayout.mock.calls[0][0][0].name).toBe('Grundlagen');
    });

    it('names an unnamed category in the labels of its buttons instead of leaving quotes empty', async () => {
        setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.clear(screen.getAllByLabelText('Name der Kategorie')[0]);
        expect(screen.queryByLabelText(/„“/)).toBeNull();
    });

    it('keeps the alert region mounted so a failed save is announced', async () => {
        setup();
        await startEditing();
        expect(document.querySelector('[role="alert"]')).not.toBeNull();
        expect(screen.queryByText('Das Speichern hat nicht geklappt')).toBeNull();
    });

    it('adds a category, renames one, and removes only an empty one', async () => {
        setup();
        const u = user();
        await u.click(label('Bearbeiten'));
        await u.click(textButton('Kategorie hinzufügen'));
        expect(screen.getAllByLabelText('Name der Kategorie')).toHaveLength(4);

        expect(label('Kategorie „Allgemein“ entfernen')).toBeDisabled();
        await u.click(label('Kategorie „Leer“ entfernen'));
        expect(screen.getAllByLabelText('Name der Kategorie')).toHaveLength(3);

        const input = screen.getAllByLabelText('Name der Kategorie')[0];
        await u.clear(input);
        expect(textButton('Speichern')).toBeDisabled();
        await u.type(input, 'Grundlagen');
        expect(textButton('Speichern')).toBeEnabled();
    });

    it('locks the visibility switches while editing, so instant and deferred saves never mix', async () => {
        setup();
        await startEditing();
        expect(screen.queryAllByRole('switch')).toHaveLength(0);
    });
});

import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { CardGrid } from '../CardGrid';
import { TopicCatalogue, type CatalogueChange, type CatalogueTopic, type TopicCatalogueProps } from './index';
import {
    FIXTURE_LANGUAGES,
    FIXTURE_LAYOUT,
    FIXTURE_LONG_LAYOUT,
    FIXTURE_LONG_TOPICS,
    FIXTURE_TOPICS,
    FIXTURE_TOPICS_I18N,
} from './topicCatalogueFixtures';
import type { TopicLayout } from './topicLayout';

/** Stands in for the translation service: marks each text with its language so the result is easy to see. */
const mockTranslate: TopicCatalogueProps['onTranslate'] = async ({ targetLangs, texts }) => {
    await new Promise((resolve) => {
        setTimeout(resolve, 600);
    });
    return Object.fromEntries(
        targetLangs.map((lang) => [
            lang,
            Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, `${text} [${lang}]`])),
        ]),
    );
};

type Save = (change: CatalogueChange) => Promise<void>;

/** Keeps the saved layout and the visibility in memory, like the server will once it can. */
const Stateful = ({
    topics: initialTopics = FIXTURE_TOPICS,
    layout: initialLayout = FIXTURE_LAYOUT,
    save,
    layoutSupported = true,
    ...rest
}: Partial<TopicCatalogueProps> & { save?: Save; layoutSupported?: boolean }) => {
    const [topics, setTopics] = useState<CatalogueTopic[]>(initialTopics);
    const [layout, setLayout] = useState<TopicLayout>(initialLayout);
    const onSaveLayout: Save =
        save ??
        (async (change) => {
            await new Promise((resolve) => {
                setTimeout(resolve, 400);
            });
            setLayout(change.layout);
            setTopics((list) => list.map((topic) => change.topics.find((entry) => entry.id === topic.id) ?? topic));
        });
    return (
        <CardGrid raster>
            <CardGrid.Item span={3}>
                <TopicCatalogue
                    {...rest}
                    topics={topics}
                    layout={layout}
                    onSaveLayout={layoutSupported ? onSaveLayout : undefined}
                    onTranslate={mockTranslate}
                    onToggleActive={(id, active) =>
                        setTopics((list) => list.map((topic) => (topic.id === id ? { ...topic, active } : topic)))
                    }
                    onOpenTopic={() => undefined}
                    onAddTopic={() => undefined}
                />
            </CardGrid.Item>
        </CardGrid>
    );
};

const meta = {
    title: 'Organisms/TopicCatalogue',
    component: TopicCatalogue,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof TopicCatalogue>;

export default meta;
type Story = StoryObj<typeof meta>;

const i18n = { topics: FIXTURE_TOPICS_I18N, languages: FIXTURE_LANGUAGES };

const base = { topics: FIXTURE_TOPICS, layout: FIXTURE_LAYOUT } satisfies Pick<
    TopicCatalogueProps,
    'topics' | 'layout'
>;

/** The platform admin's view: one panel per category, a switch per topic, no numbers. */
export const Loaded: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: 'Migration' })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
    },
};

/** "Bearbeiten" turns on the handles, the category names and the buttons for moving. */
export const EditMode: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        await expect(await canvas.findByRole('button', { name: 'Speichern' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Abbrechen' })).toBeEnabled();
    },
};

/** Arrow keys on the handle move a topic; the change is announced and Save becomes available. */
export const KeyboardReorder: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const handle = await canvas.findByRole('button', { name: '„Allgemeine Sozialberatung“ verschieben' });
        handle.focus();
        await userEvent.keyboard('{ArrowDown}');
        await waitFor(() =>
            expect(canvas.getByRole('status')).toHaveTextContent('Platz 2 von 4 in „Allgemeine Beratung“'),
        );
        await userEvent.keyboard('{ArrowRight}');
        await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('in „Kinder, Jugend und Familie“'));
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

/** The save is on its way: everything is locked, the button shows progress. */
export const Saving: Story = {
    args: base,
    render: () => (
        <Stateful
            {...i18n}
            save={() =>
                new Promise<void>(() => {
                    // never settles: the save stays in flight
                })
            }
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const handle = await canvas.findByRole('button', { name: '„Sucht“ verschieben' });
        handle.focus();
        await userEvent.keyboard('{ArrowDown}');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(canvas.getByRole('button', { name: 'Abbrechen' })).toBeDisabled());
    },
};

/** The server said no: the changes stay in the draft and the message says so. */
export const SaveError: Story = {
    args: base,
    render: () => <Stateful {...i18n} save={() => Promise.reject(new Error('500'))} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const handle = await canvas.findByRole('button', { name: '„Sucht“ verschieben' });
        handle.focus();
        await userEvent.keyboard('{ArrowDown}');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await expect(await canvas.findByRole('alert')).toHaveTextContent('Das Speichern hat nicht geklappt');
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

/** An empty category can take a topic by drag or by the category select; a new one can be added. */
export const NewCategory: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        await userEvent.click(await canvas.findByRole('button', { name: 'Kategorie hinzufügen' }));
        await expect(await canvas.findByText('Thema hierher ziehen')).toBeInTheDocument();
    },
};

/** The server holds nothing yet to keep a layout in: no edit mode, the switches still work. */
export const LayoutNotSupported: Story = {
    args: base,
    render: () => <Stateful layoutSupported={false} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: 'Migration' })).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
    },
};

/** The viewer may only look: switches are locked, no edit button, and the footer says why. */
export const ReadOnly: Story = {
    args: base,
    render: () => <Stateful readOnlyReason="Nur Plattform-Admins können Themen ändern." />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Nur Plattform-Admins können Themen ändern.')).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
        await expect(canvas.getAllByRole('switch')[0]).toBeDisabled();
    },
};

export const Empty: Story = {
    args: { topics: [], layout: [] },
    render: () => <Stateful topics={[]} layout={[]} />,
};

export const Loading: Story = {
    args: base,
    render: () => <Stateful isLoading />,
};

export const LoadError: Story = {
    args: base,
    render: () => <Stateful topics={[]} layout={[]} loadError onRetry={() => undefined} />,
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('nicht geladen werden');
    },
};

/** Long German names and a name without a space must wrap, not break the row. */
export const LongestGerman: Story = {
    args: base,
    render: () => <Stateful topics={FIXTURE_LONG_TOPICS} layout={FIXTURE_LONG_LAYOUT} />,
};

export const LongestGermanEditing: Story = {
    args: base,
    render: () => <Stateful topics={FIXTURE_LONG_TOPICS} layout={FIXTURE_LONG_LAYOUT} />,
    play: async ({ canvasElement }) => {
        await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Bearbeiten' }));
    },
};

/** Edit mode: categories on the left, all topics on the right. "Schulden" already sits in two categories. */
export const TwoColumns: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        await expect(await canvas.findByRole('heading', { name: 'Kategorien' })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: 'Themen (20)' })).toBeInTheDocument();
        await expect(canvas.getAllByText('In 2 Kategorien').length).toBeGreaterThan(0);
    },
};

/** The category select on a topic copies it into one more category; the topic keeps its other places. */
export const AddTopicToSecondCategory: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const select = await canvas.findByRole('combobox', { name: '„Sucht“ zu einer Kategorie hinzufügen' });
        await userEvent.selectOptions(select, 'Migration');
        await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('„Sucht“ zu „Migration“ hinzugefügt'));
        await expect(canvas.getByRole('button', { name: '„Sucht“ aus „Migration“ entfernen' })).toBeInTheDocument();
    },
};

/** "+" before a topic uploads its own icon (SVG or PNG); it shows at once and Save becomes available. */
export const UploadIcon: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const input = await canvas.findByTestId('icon-input-Sucht');
        const file = new File(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#a5000a"/></svg>',
            ],
            'sucht.svg',
            {
                type: 'image/svg+xml',
            },
        );
        await userEvent.upload(input, file);
        await expect(await canvas.findByRole('button', { name: 'Icon von „Sucht“ ersetzen' })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

/** Categories get a picture of their own as well (later used for games); same rules as for topics. */
export const UploadCategoryIcon: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const input = await canvas.findByTestId('icon-input-Gesundheit und Leben');
        const file = new File(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="4" fill="#0b57d0"/></svg>',
            ],
            'gesundheit.svg',
            { type: 'image/svg+xml' },
        );
        await userEvent.upload(input, file);
        await expect(
            await canvas.findByRole('button', { name: 'Icon von „Gesundheit und Leben“ ersetzen' }),
        ).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

/** Anything but SVG or PNG is refused with a message in the footer. */
export const UploadIconWrongType: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        const input = await canvas.findByTestId('icon-input-Sucht');
        await userEvent.upload(input, new File(['x'], 'sucht.gif', { type: 'image/gif' }), { applyAccept: false });
        await expect(await canvas.findByRole('alert')).toHaveTextContent('SVG- oder PNG-Datei');
    },
};

/** Another language: untranslated texts are bold with a warning icon and show the German text meanwhile. */
export const OtherLanguage: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /^Englisch/ }));
        await expect((await canvas.findAllByRole('img', { name: 'Noch nicht übersetzt' })).length).toBeGreaterThan(0);
    },
};

/** Edit mode in French: the names become inputs, empty ones are marked, the German text is the hint. */
export const OtherLanguageEditing: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        await userEvent.click(await canvas.findByRole('button', { name: /^Französisch/ }));
        await expect(await canvas.findByRole('textbox', { name: 'Name von „Sucht“ auf Französisch' })).toHaveValue('');
    },
};

/** The AI button fills every gap in every language; those texts are italic with a sparkle until checked. */
export const AiTranslation: Story = {
    args: base,
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Bearbeiten' }));
        await userEvent.click(await canvas.findByRole('button', { name: 'Fehlende Texte mit KI übersetzen' }));
        await waitFor(() => expect(canvasElement.textContent).toContain('Texte übersetzt'), { timeout: 5000 });
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    },
};

export const TwoColumnsMobile: Story = {
    args: base,
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => <Stateful {...i18n} />,
    play: async ({ canvasElement }) => {
        await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Bearbeiten' }));
    },
};

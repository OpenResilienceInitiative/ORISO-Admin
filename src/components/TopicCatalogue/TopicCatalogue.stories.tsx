import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { CardGrid } from '../CardGrid';
import { TopicCatalogue, type CatalogueTopic, type TopicCatalogueProps } from './index';
import { FIXTURE_LAYOUT, FIXTURE_LONG_LAYOUT, FIXTURE_LONG_TOPICS, FIXTURE_TOPICS } from './topicCatalogueFixtures';
import type { TopicLayout } from './topicLayout';

type Save = (layout: TopicLayout) => Promise<void>;

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
        (async (next) => {
            await new Promise((resolve) => {
                setTimeout(resolve, 400);
            });
            setLayout(next);
        });
    return (
        <CardGrid raster>
            <CardGrid.Item span={3}>
                <TopicCatalogue
                    {...rest}
                    topics={topics}
                    layout={layout}
                    onSaveLayout={layoutSupported ? onSaveLayout : undefined}
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

const base = { topics: FIXTURE_TOPICS, layout: FIXTURE_LAYOUT } satisfies Pick<
    TopicCatalogueProps,
    'topics' | 'layout'
>;

/** The platform admin's view: one panel per category, a switch per topic, no numbers. */
export const Loaded: Story = {
    args: base,
    render: () => <Stateful />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('heading', { name: 'Migration' })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
    },
};

/** "Bearbeiten" turns on the handles, the category names and the buttons for moving. */
export const EditMode: Story = {
    args: base,
    render: () => <Stateful />,
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
    render: () => <Stateful />,
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
    render: () => <Stateful save={() => Promise.reject(new Error('500'))} />,
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
    render: () => <Stateful />,
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

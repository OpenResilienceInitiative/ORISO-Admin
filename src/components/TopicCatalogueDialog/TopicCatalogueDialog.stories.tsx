import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { TopicCatalogueDto } from '../../types/TopicCatalogue';
import {
    FIXTURE_ICON,
    FIXTURE_LANGUAGES,
    FIXTURE_LAYOUT,
    FIXTURE_TOPICS,
} from '../TopicCatalogue/topicCatalogueFixtures';
import { TopicCatalogueDialog, TopicCatalogueEditor } from '.';

/** The dev topics as GET /topicadmin/catalogue answers them; two own pictures, one topic without any. */
const catalogue: TopicCatalogueDto = {
    groups: FIXTURE_LAYOUT.map((group, index) => ({
        id: index + 1,
        name: { de: group.name, en: `${group.name} (en)` },
        icon: index === 0 ? FIXTURE_ICON : null,
        topicIds: group.topicIds,
    })),
    topics: FIXTURE_TOPICS.map((topic) => ({
        id: topic.id,
        status: topic.active ? 'ACTIVE' : 'INACTIVE',
        name: { de: topic.name, ...(topic.id % 3 ? { en: `${topic.name} (en)` } : {}) },
        description: { de: topic.description ?? '' },
        icon: topic.id === 14 || topic.id === 17 ? FIXTURE_ICON : null,
    })),
};

const meta = {
    title: 'Organisms/TopicCatalogueDialog',
    component: TopicCatalogueDialog,
    parameters: { layout: 'fullscreen' },
    args: {
        catalogue,
        languages: FIXTURE_LANGUAGES,
        onSave: fn(async () => undefined),
        onClose: fn(),
    },
} satisfies Meta<typeof TopicCatalogueDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Settings → Themen → Bearbeiten: pool left, categories right like the registration. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByRole('dialog')).toBeInTheDocument();
        await expect(body.getByRole('list', { name: 'Alle Themen' })).toBeInTheDocument();
    },
};

/** A topic opened for its texts, in a second language with gaps marked. */
export const EditingATranslation: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: /Englisch/ }));
        await userEvent.click(body.getAllByRole('button', { name: /Allgemeine Sozialberatung/ })[0]);
        await expect(body.getAllByText('Übersetzung fehlt').length).toBeGreaterThan(0);
    },
};

/** Saving fails: the dialog stays open and says so. */
export const SaveError: Story = {
    args: { onSave: fn(async () => Promise.reject(new Error('500'))) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click((await body.findAllByRole('button', { name: 'Kategorie nach unten' }))[0]);
        await userEvent.click(body.getByRole('button', { name: 'Speichern' }));
        await expect(await body.findByText(/nicht gespeichert/)).toBeInTheDocument();
    },
};

/** The page itself (Settings → Themen): one view, read mode first; "Bearbeiten" turns on the editing in place. */
const InlineHarness = ({ startEditing = false }: { startEditing?: boolean }) => {
    const [editing, setEditing] = useState(startEditing);
    return (
        <div style={{ padding: 24 }}>
            <TopicCatalogueEditor
                variant="inline"
                catalogue={catalogue}
                languages={FIXTURE_LANGUAGES}
                editing={editing}
                onEdit={() => setEditing(true)}
                onCancel={() => setEditing(false)}
                onSave={async () => setEditing(false)}
                onToggleActive={() => undefined}
                onTranslate={async ({ targetLangs, texts }) => ({
                    provider: 'story',
                    model: 'story',
                    translations: Object.fromEntries(
                        targetLangs.map((code) => [
                            code,
                            Object.fromEntries(
                                Object.entries(texts).map(([key, value]) => [key, `${value} [${code}]`]),
                            ),
                        ]),
                    ),
                })}
            />
        </div>
    );
};

/** Read mode on the page: no handles, arrows or fields, only the visibility switches and "Bearbeiten". */
export const OnThePage: Story = {
    render: () => <InlineHarness />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByLabelText('Bearbeiten')).toBeInTheDocument();
        await expect(canvas.queryByRole('dialog')).toBeNull();
        await expect(canvas.queryAllByRole('button', { name: 'Kategorie nach unten' })).toHaveLength(0);
        await expect(canvas.getAllByRole('switch').length).toBeGreaterThan(0);
    },
};

/** Same place after "Bearbeiten": the editing controls appear, no second layer opens. */
export const OnThePageEditing: Story = {
    render: () => <InlineHarness />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByLabelText('Bearbeiten'));
        await expect(canvas.queryByRole('dialog')).toBeNull();
        await expect(canvas.getAllByRole('button', { name: 'Kategorie nach unten' }).length).toBeGreaterThan(0);
        await expect(canvas.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    },
};

/** The AI button of the Journeys: fills every missing text, the translate mark shows which texts a machine wrote. */
export const OnThePageTranslated: Story = {
    render: () => <InlineHarness />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Bearbeiten|Edit/ }));
        await userEvent.click(canvas.getByRole('button', { name: /KI|AI/ }));
        await userEvent.click(canvas.getAllByRole('button', { name: /Englisch|English/ })[0]);
        await expect((await canvas.findAllByRole('img', { name: /Maschinell|Machine/ })).length).toBeGreaterThan(0);
    },
};

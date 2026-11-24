import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { TopicCatalogueDto } from '../../types/TopicCatalogue';
import {
    FIXTURE_ICON,
    FIXTURE_LANGUAGES,
    FIXTURE_LAYOUT,
    FIXTURE_TOPICS,
} from '../TopicCatalogue/topicCatalogueFixtures';
import { TopicCatalogueDialog } from '.';

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

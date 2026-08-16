import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LegalContentLanguageSelect } from './index';

/** Wrapper that owns the selected-language state so switching is interactive. */
const StatefulLanguageSelect = (args: ComponentProps<typeof LegalContentLanguageSelect>) => {
    const [value, setValue] = useState(args.value);
    return <LegalContentLanguageSelect {...args} value={value} onChange={setValue} />;
};

const meta = {
    title: 'Molecules/LegalContentLanguageSelect',
    component: LegalContentLanguageSelect,
    parameters: { layout: 'padded' },
    args: {
        languages: ['de', 'en'],
        value: 'de',
        sourceLanguage: 'de',
        onChange: () => {},
    },
} satisfies Meta<typeof LegalContentLanguageSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The "🌐 language ▾" split button used by the state-based legal editors (DPA /
 * department data privacy). The leading button shows the current language; the trailing
 * caret opens the language menu. Interactive — pick a language to switch the label.
 */
export const Default: Story = {
    render: (args) => <StatefulLanguageSelect {...args} />,
};

/**
 * The source language is labelled "… (Original)" and machine-translated languages
 * "… (maschinell übersetzt)" in the menu, driven by the `__meta` map.
 */
export const WithMachineTranslation: Story = {
    args: {
        languages: ['de', 'en', 'fr'],
        contentMap: {
            de: '<p>Original</p>',
            en: '<p>Machine</p>',
            en__meta: JSON.stringify({ mt: true, src: 'de', at: '2026-01-01T00:00:00.000Z' }),
            fr: '<p>Machine</p>',
            fr__meta: JSON.stringify({ mt: true, src: 'de', at: '2026-01-01T00:00:00.000Z' }),
        } as Record<string, string>,
    },
    render: (args) => <StatefulLanguageSelect {...args} />,
};

/**
 * Languages that carry no content yet are labelled "… (noch kein Inhalt)" in the menu,
 * so an admin sees the gap before publishing into the wrong language (#718).
 */
export const WithEmptyLanguage: Story = {
    args: {
        languages: ['de', 'en', 'ru'],
        contentMap: {
            de: '<p>Original</p>',
            en: '',
        } as Record<string, string>,
    },
    render: (args) => <StatefulLanguageSelect {...args} />,
};

/** With only one language the component renders nothing (nothing to switch). */
export const SingleLanguageHidden: Story = {
    args: { languages: ['de'] },
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PillGroup, type PillOption } from './index';

const LANGUAGES: PillOption[] = [
    { value: 'de', label: 'German', locked: true },
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Russian' },
    { value: 'ti', label: 'Tigrinya' },
    { value: 'tr', label: 'Turkish' },
    { value: 'fr', label: 'French' },
    { value: 'uk', label: 'Ukrainian' },
];

const meta = {
    title: 'Molecules/PillGroup',
    component: PillGroup,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34207',
        },
    },
} satisfies Meta<typeof PillGroup>;

export default meta;

const LanguagesExample = () => {
    const [value, setValue] = useState<string[]>(['de', 'en']);
    return (
        <div style={{ maxWidth: 460 }}>
            <PillGroup options={LANGUAGES} value={value} onChange={setValue} />
        </div>
    );
};

/** Languages card (Figma 1-34207): multi-select, German locked as default. */
export const Languages: StoryObj = {
    render: () => <LanguagesExample />,
};

const SingleSelectExample = () => {
    const [value, setValue] = useState<string[]>(['en']);
    const opts = LANGUAGES.filter((l) => ['de', 'en', 'tr', 'uk'].includes(l.value)).map((l) => ({
        ...l,
        locked: false,
    }));
    return (
        <div style={{ maxWidth: 460 }}>
            <PillGroup mode="single" options={opts} value={value} onChange={setValue} />
        </div>
    );
};

/** Single-select segment (Case-takeover notification language). */
export const SingleSelect: StoryObj = {
    render: () => <SingleSelectExample />,
};

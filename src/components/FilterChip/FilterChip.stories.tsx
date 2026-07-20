import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterChip } from './index';

const meta = {
    title: 'Atoms/FilterChip',
    component: FilterChip,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34786',
        },
    },
    args: { label: 'HIV & AIDS' },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};
export const Selected: Story = { args: { selected: true, label: 'Addiction' } };
export const DisabledSelected: Story = { args: { selected: true, disabled: true, label: 'Take over case' } };

const TOPICS = [
    'Children and Adolescents',
    'Boys and Men',
    'Hospice & Palliative Care',
    'HIV & AIDS',
    'Child & Youth Rehabilitation',
    'Emigration, Return & Further Migration',
    'Parents and Family',
    'Disability & Mental Impairment',
];

const FocusTopicsExample = () => {
    const [selected, setSelected] = useState<string[]>(['HIV & AIDS', 'Disability & Mental Impairment']);
    const toggle = (topic: string) =>
        setSelected((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 420 }}>
            {TOPICS.map((topic) => (
                <FilterChip
                    key={topic}
                    label={topic}
                    selected={selected.includes(topic)}
                    onChange={() => toggle(topic)}
                />
            ))}
        </div>
    );
};

/** Focus Topics card group (Figma 1-34786): wrap of toggle chips, multi-select. */
export const FocusTopicsGroup: StoryObj = {
    render: () => <FocusTopicsExample />,
};

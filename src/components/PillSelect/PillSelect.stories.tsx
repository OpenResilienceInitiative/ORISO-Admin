import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlusOutlined } from '@ant-design/icons';
import { ReactComponent as TopicIcon } from '../../resources/img/svg/oriso/topic_400_24px.svg';
import { ReactComponent as TopicFilledIcon } from '../../resources/img/svg/oriso/topic_filled_24px.svg';
import { ReactComponent as NearbyIcon } from '../../resources/img/svg/oriso/nearby_conv_type_200_24px.svg';
import { ReactComponent as NearbyFilledIcon } from '../../resources/img/svg/oriso/nearby_conv_type_filled_24px.svg';
import { ReactComponent as ScheduleIcon } from '../../resources/img/svg/oriso/schedule_24px.svg';
import { ReactComponent as ScheduleFilledIcon } from '../../resources/img/svg/oriso/schedule_filled_24px.svg';
import { PillSelect, type PillSelectProps } from './index';
import { PillFilterRow, type PillFilterConfig } from './PillFilterRow';

const topicOptions = [
    { value: 'legal', label: 'Rechtshilfe und Beratung' },
    { value: 'family', label: 'Familienberatung' },
    { value: 'debt', label: 'Schuldnerberatung' },
];

const conversationTypeOptions = [
    { value: 'nearby', label: 'Nähe' },
    { value: 'chat', label: 'Chat' },
    { value: 'video', label: 'Video' },
];

const expiryOptions = [
    { value: 'none', label: 'Kein Ablaufdatum' },
    { value: '30d', label: '30 Tage' },
    { value: '90d', label: '90 Tage' },
];

const meta = {
    title: 'Molecules/PillSelect',
    component: PillSelect,
    parameters: { layout: 'padded' },
    args: {
        label: 'Thema',
        options: topicOptions,
        icon: <TopicIcon />,
        selectedIcon: <TopicFilledIcon />,
    },
} satisfies Meta<typeof PillSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const emptyFilters: PillFilterConfig[] = [
    { key: 'topic', label: 'Topic', icon: <TopicIcon />, selectedIcon: <TopicFilledIcon />, options: topicOptions },
    {
        key: 'conversationType',
        label: 'Conversation Type',
        icon: <NearbyIcon />,
        selectedIcon: <NearbyFilledIcon />,
        options: conversationTypeOptions,
    },
    {
        key: 'expiryDate',
        label: 'Expiry Date',
        icon: <ScheduleIcon />,
        selectedIcon: <ScheduleFilledIcon />,
        options: expiryOptions,
    },
];

/** Figma row 1165:18110 — nothing selected, outlined pills, disabled "+ New". */
export const UnselectedFilterRow: Story = {
    render: () => <PillFilterRow filters={emptyFilters} action={{ label: 'New', icon: <PlusOutlined /> }} />,
};

/** Figma row 1165:17028 — every filter selected, tonal pills, primary "+ New". */
export const SelectedFilterRow: Story = {
    render: () => (
        <PillFilterRow
            filters={emptyFilters.map((filter): PillFilterConfig => {
                if (filter.mode === 'multiple') {
                    return { ...filter, value: [filter.options[0].value] };
                }

                return {
                    ...filter,
                    value:
                        // eslint-disable-next-line no-nested-ternary
                        filter.key === 'topic' ? 'legal' : filter.key === 'conversationType' ? 'nearby' : 'none',
                };
            })}
            action={{ label: 'New', icon: <PlusOutlined /> }}
        />
    ),
};

const InteractiveRowExample = () => {
    const [topic, setTopic] = useState<string | null>(null);
    const [conversationType, setConversationType] = useState<string | null>(null);
    const [expiry, setExpiry] = useState<string | null>(null);

    const filters: PillFilterConfig[] = [
        {
            key: 'topic',
            label: 'Topic',
            icon: <TopicIcon />,
            selectedIcon: <TopicFilledIcon />,
            options: topicOptions,
            value: topic,
            onChange: setTopic,
        },
        {
            key: 'conversationType',
            label: 'Conversation Type',
            icon: <NearbyIcon />,
            selectedIcon: <NearbyFilledIcon />,
            options: conversationTypeOptions,
            value: conversationType,
            onChange: setConversationType,
        },
        {
            key: 'expiryDate',
            label: 'Expiry Date',
            icon: <ScheduleIcon />,
            selectedIcon: <ScheduleFilledIcon />,
            options: expiryOptions,
            value: expiry,
            onChange: setExpiry,
        },
    ];

    return <PillFilterRow filters={filters} action={{ label: 'New', icon: <PlusOutlined /> }} />;
};

/** Select all three filters to see the action button flip from disabled to primary. */
export const InteractiveFilterRow: Story = {
    render: () => <InteractiveRowExample />,
};

const SingleSelectExample = (args: PillSelectProps) => {
    const [value, setValue] = useState<string | null>(null);
    return <PillSelect {...args} mode="single" value={value} onChange={setValue} />;
};

export const SingleSelect: Story = {
    render: (args) => <SingleSelectExample {...args} />,
};

const MultiSelectExample = (args: PillSelectProps) => {
    const [value, setValue] = useState<string[]>([]);
    return <PillSelect {...args} mode="multiple" value={value} onChange={setValue} />;
};

/** Checkbox options; two or more selections summarize as "Label (n)". */
export const MultiSelect: Story = {
    render: (args) => <MultiSelectExample {...args} />,
};

export const DisabledPill: Story = {
    args: { disabled: true },
};

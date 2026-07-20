import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { FocusTopicsCard } from './index';

const TOPICS = [
    'Addiction',
    'Children and Adolescents',
    'Boys and Men',
    'Hospice & Palliative Care',
    'HIV & AIDS',
    'Child & Youth Rehabilitation',
    'Emigration, Return & Further Migration',
    'Parents and Family',
    'Disability & Mental Impairment',
];

const meta: Meta<typeof FocusTopicsCard> = {
    title: 'Organisms/Cards/FocusTopics',
    component: FocusTopicsCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34786',
        },
    },
};

export default meta;

const FocusTopicsExample = () => {
    const [selected, setSelected] = useState<string[]>(['HIV & AIDS', 'Disability & Mental Impairment']);
    const toggle = (topic: string) =>
        setSelected((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
    return (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 40,
                    minHeight: '100vh',
                    background: 'var(--admin-workspace-background, #e4e2e2)',
                }}
            >
                <FocusTopicsCard
                    topics={TOPICS}
                    selected={selected}
                    onToggle={toggle}
                    onBack={() => undefined}
                    onNext={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

/** Rendered on the real workspace background, exactly as it sits in the wizard. */
export const Default: StoryObj = {
    render: () => <FocusTopicsExample />,
};

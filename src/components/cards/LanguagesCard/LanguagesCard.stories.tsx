import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { LanguagesCard } from './index';
import type { PillOption } from '../../PillGroup';

const LANGUAGES: PillOption[] = [
    { value: 'de', label: 'German', locked: true },
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Russian' },
    { value: 'ti', label: 'Tigrinya' },
    { value: 'tr', label: 'Turkish' },
    { value: 'fr', label: 'French' },
    { value: 'uk', label: 'Ukrainian' },
];

export default {
    title: 'Organisms/Cards/Languages',
    component: LanguagesCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34207',
        },
    },
};

const LanguagesExample = () => {
    const [selected, setSelected] = useState<string[]>(['de', 'en']);
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
                <LanguagesCard
                    languages={LANGUAGES}
                    selected={selected}
                    onChange={setSelected}
                    onEdit={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <LanguagesExample />,
};

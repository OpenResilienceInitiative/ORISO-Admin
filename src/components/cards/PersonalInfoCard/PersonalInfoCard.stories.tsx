import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { PersonalInfoCard, type PersonalInfo } from './index';

export default {
    title: 'Organisms/Cards/PersonalInfo',
    component: PersonalInfoCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34809',
        },
    },
};

const PersonalInfoExample = () => {
    const [value, setValue] = useState<PersonalInfo>({
        firstName: '',
        lastName: '',
        salutation: undefined,
        position: '',
        title: '',
        remarks: '',
    });
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
                <PersonalInfoCard
                    value={value}
                    onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
                    onBack={() => undefined}
                    onNext={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <PersonalInfoExample />,
};

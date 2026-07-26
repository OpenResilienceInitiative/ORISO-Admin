import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { CaseTakeoverCard, type CaseTakeoverValue } from './index';

export default {
    title: 'Organisms/Cards/CaseTakeover',
    component: CaseTakeoverCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=900-7044',
        },
    },
};

const CaseTakeoverExample = () => {
    const [value, setValue] = useState<CaseTakeoverValue>({
        activated: true,
        optOut: false,
        activeTab: 'advice',
        consentSeeker: true,
        consentAdvisor: false,
        sessionDuration: '3h',
        notificationLang: 'en',
        notificationText:
            'The previous advisor is unfortunately ill. Therefore, your case has been handed over to {New Advisor}.',
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
                <CaseTakeoverCard
                    value={value}
                    onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
                    onConfig={() => undefined}
                    onEnforce={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <CaseTakeoverExample />,
};

import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { AdvisorAccountCard, type AdvisorAccount } from './index';

export default {
    title: 'Organisms/Cards/AdvisorAccount',
    component: AdvisorAccountCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34789',
        },
    },
};

const AdvisorAccountExample = () => {
    const [value, setValue] = useState<AdvisorAccount>({ email: 'example@caritas.de', username: '', password: '' });
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
                <AdvisorAccountCard
                    value={value}
                    onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
                    onBatchMode={() => undefined}
                    onSendInvitation={() => undefined}
                    onLinkOtp={() => undefined}
                    onCancel={() => undefined}
                    onNext={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <AdvisorAccountExample />,
};

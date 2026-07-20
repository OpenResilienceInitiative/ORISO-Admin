import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { BatchModeCard, type BatchInvite } from './index';

export default {
    title: 'Organisms/Cards/BatchMode',
    component: BatchModeCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34790',
        },
    },
};

const BatchModeExample = () => {
    const [value, setValue] = useState<BatchInvite>({
        email: 'example@caritas.de',
        salutation: '',
        firstName: '',
        lastName: '',
        emailText:
            'Invitation to register on the online counseling platform OBP 2.0. Setup is step-by-step. Please click the link below and follow the instructions.',
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
                <BatchModeCard
                    value={value}
                    onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
                    onAnotherPerson={() => undefined}
                    onCancel={() => undefined}
                    onSendToAll={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <BatchModeExample />,
};

import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { SuccessCard } from './index';

export default {
    title: 'Organisms/Cards/Success',
    component: SuccessCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34805',
        },
    },
};

const SuccessExample = () => {
    const [notes, setNotes] = useState('');
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
                <SuccessCard notes={notes} onNotesChange={setNotes} onFinish={() => undefined} />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <SuccessExample />,
};

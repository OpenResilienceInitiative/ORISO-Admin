import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { CustomImagesCard } from './index';

export default {
    title: 'Organisms/Cards/CustomImages',
    component: CustomImagesCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34189',
        },
    },
};

export const Default: StoryObj = {
    render: () => (
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
                <CustomImagesCard
                    onUploadLogo={() => undefined}
                    onUploadFavicon={() => undefined}
                    onEdit={() => undefined}
                />
            </div>
        </ConfigProvider>
    ),
};

import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { AvatarNameCard, type AvatarNameValue } from './index';
import type { AvatarOption } from '../../AvatarPickerGrid';
import { ANIMAL_AVATARS } from '../../../resources/img/svg/avatars';

const AVATARS: AvatarOption[] = ANIMAL_AVATARS.map(({ id, Icon }) => ({ id, node: <Icon />, label: id }));

export default {
    title: 'Organisms/Cards/AvatarName',
    component: AvatarNameCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34788',
        },
    },
};

const AvatarNameExample = () => {
    const [value, setValue] = useState<AvatarNameValue>({
        avatarId: 'fox',
        publicName: '',
        internalName: '',
        ownPictureInternalOnly: true,
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
                <AvatarNameCard
                    avatars={AVATARS}
                    value={value}
                    onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
                    onUploadPicture={() => undefined}
                    onBack={() => undefined}
                    onNext={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <AvatarNameExample />,
};

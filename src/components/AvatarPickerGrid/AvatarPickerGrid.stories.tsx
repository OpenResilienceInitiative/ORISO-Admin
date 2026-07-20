import { useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { AvatarPickerGrid, type AvatarOption } from './index';
import { ANIMAL_AVATARS } from '../../resources/img/svg/avatars';

const AVATARS: AvatarOption[] = ANIMAL_AVATARS.map(({ id, Icon }) => ({
    id,
    node: <Icon />,
    label: id,
}));

export default {
    title: 'Molecules/AvatarPickerGrid',
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34788',
        },
    },
};

const AvatarPickerExample = () => {
    const [value, setValue] = useState(AVATARS[3]?.id);
    return (
        <div style={{ maxWidth: 360 }}>
            <AvatarPickerGrid avatars={AVATARS} value={value} onChange={setValue} />
        </div>
    );
};

export const Default: StoryObj = {
    render: () => <AvatarPickerExample />,
};

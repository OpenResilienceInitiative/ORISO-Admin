import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageUploadField } from './index';

const meta = {
    title: 'Molecules/ImageUploadField',
    component: ImageUploadField,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34788',
        },
    },
    args: { onUpload: () => undefined },
} satisfies Meta<typeof ImageUploadField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Avatar card "Own picture" (Figma 1-34788). */
export const OwnPicture: Story = {
    args: {
        title: 'Own picture',
        helper: 'When empty the display name for those seeking advice is used.',
    },
    render: (args) => (
        <div style={{ maxWidth: 340 }}>
            <ImageUploadField {...args} />
        </div>
    ),
};

/** Individuelle Bilder logo tile (Figma 1-34189). */
export const Logo: Story = {
    args: { title: 'Logo · 512×512px', shape: 'rounded', uploadLabel: 'Upload' },
    render: (args) => (
        <div style={{ maxWidth: 340 }}>
            <ImageUploadField {...args} />
        </div>
    ),
};

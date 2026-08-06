import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import FileUploader from './FileUploader';

/** Wrapper that owns the preview URL so uploading updates the card in the story. */
const StatefulFileUploader = (args: ComponentProps<typeof FileUploader>) => {
    const [imageUrl, setImageUrl] = useState<string>(args.imageUrl || '');
    return <FileUploader {...args} imageUrl={imageUrl} setImageUrl={setImageUrl} />;
};

const meta = {
    title: 'Molecules/FileUploader',
    component: FileUploader,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'logo',
        label: 'Logo',
        getValueFromEvent: (e) => e,
        imageUrl: '',
        setImageUrl: () => {},
    },
} satisfies Meta<typeof FileUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty picture-card that accepts JPG/PNG (and .ico for favicons) up to 512 kB. */
export const Empty: Story = {
    render: (args) => <StatefulFileUploader {...args} />,
};

/** Populated state — the selected image (base64 data URL) fills the card. */
export const WithPreview: Story = {
    args: {
        // 1x1 transparent PNG, stands in for an uploaded image.
        imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
};

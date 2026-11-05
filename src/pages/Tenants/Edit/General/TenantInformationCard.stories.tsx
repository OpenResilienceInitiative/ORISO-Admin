import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { Form } from 'antd';
import { CardGrid } from '../../../../components/CardGrid';
import { TenantInformationCard } from './TenantInformationCard';

const Example = () => {
    const [form] = Form.useForm();
    return (
        <CardGrid raster>
            <CardGrid.Item>
                <TenantInformationCard
                    form={form}
                    initialValues={{
                        name: 'Beispiel-Träger',
                        subdomain: 'beispiel',
                        address: 'Musterstraße 1',
                        licensing: { allowedNumberOfUsers: 25 },
                    }}
                    isLoading={false}
                    shouldShowSubdomainField
                    onSave={() => {}}
                />
            </CardGrid.Item>
        </CardGrid>
    );
};

const meta = {
    title: 'Settings/Träger/Stammdaten/Trägerinformationen',
    component: Example,
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Filled: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText(/Trägerinformationen|Tenant information/i)).toBeVisible();
    },
};

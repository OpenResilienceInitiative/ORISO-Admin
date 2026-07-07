import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { AgencyGeneralInformation } from './index';

/**
 * Story for the agency ("Beratungsstelle") general-information form section.
 * Renders the field set inside an antd Form so the new structured
 * address/contact fields (street, house number, floor/building, country,
 * phone, secondary phone, email) can be reviewed without a backend or login.
 */
const meta: Meta<typeof AgencyGeneralInformation> = {
    title: 'Organisms/Agency/GeneralInformation',
    component: AgencyGeneralInformation,
    decorators: [
        (Story) => (
            <Form layout="vertical" style={{ maxWidth: 960, padding: 24 }}>
                <Story />
            </Form>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof AgencyGeneralInformation>;

export const Default: Story = {
    args: { asFields: true },
};

import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { AddressFields } from './index';

/**
 * The address as one grouped block (street + number, postcode + city, floor, country). Same field
 * names and rules as the loose agency fields, so the form data is unchanged.
 */
const meta: Meta<typeof AddressFields> = {
    title: 'Molecules/AddressFields',
    component: AddressFields,
};

export default meta;

type Story = StoryObj<typeof AddressFields>;

const Frame = ({
    initialValues,
    validate,
    disabled,
    width = 560,
}: {
    initialValues?: Record<string, string>;
    validate?: boolean;
    disabled?: boolean;
    width?: number;
}) => {
    const [form] = Form.useForm();
    useEffect(() => {
        if (validate) form.validateFields().catch(() => undefined);
    }, [form, validate]);
    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div style={{ maxWidth: width, padding: 24 }}>
                <Form form={form} layout="vertical" initialValues={initialValues} disabled={disabled}>
                    <AddressFields />
                </Form>
            </div>
        </ThemeProvider>
    );
};

export const Empty: Story = { render: () => <Frame /> };

export const Filled: Story = {
    render: () => (
        <Frame
            initialValues={{
                street: 'Musterstraße',
                houseNumber: '12a',
                postcode: '79098',
                city: 'Freiburg im Breisgau',
                floorBuilding: '3. OG, Haus B',
                country: 'Deutschland',
            }}
        />
    ),
};

/** Longest realistic German values. */
export const LongestText: Story = {
    render: () => (
        <Frame
            initialValues={{
                street: 'Friedrich-Wilhelm-von-Steuben-Gedächtnisstraße',
                houseNumber: '123-127b',
                postcode: '79098',
                city: 'Sankt Georgen im Schwarzwald-Baar-Kreis',
                floorBuilding: 'Verwaltungsgebäude Nord, 3. Obergeschoss, Raum 312',
                country: 'Bundesrepublik Deutschland',
            }}
        />
    ),
};

/** Required postcode and city are empty or too short: both flag their own error. */
export const Error: Story = { render: () => <Frame validate initialValues={{ postcode: '12' }} /> };

export const ReadOnly: Story = {
    render: () => (
        <Frame
            disabled
            initialValues={{ street: 'Musterstraße', houseNumber: '12a', postcode: '79098', city: 'Freiburg' }}
        />
    ),
};

/** The 390px phone width. */
export const Mobile: Story = {
    render: () => (
        <Frame
            width={342}
            initialValues={{ street: 'Musterstraße', houseNumber: '12a', postcode: '79098', city: 'Freiburg' }}
        />
    ),
};

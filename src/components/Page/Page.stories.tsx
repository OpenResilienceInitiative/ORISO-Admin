import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page } from './index';

const meta = {
    title: 'Organisms/Page',
    component: Page,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
    <div style={{ padding: 24 }}>
        <p>Page content goes here.</p>
    </div>
);

/** The page shell that wraps every admin route (sticky header + scrollable content). */
export const Default: Story = {
    render: () => (
        <Page>
            <SampleContent />
        </Page>
    ),
};

/** Loading state — renders an antd spinner instead of the content. */
export const Loading: Story = {
    render: () => <Page isLoading />,
};

/** With a back header (`Page.Back`) linking to a parent route. */
export const WithBackHeader: Story = {
    render: () => (
        <Page>
            <Page.Back path="/admin/users" title="Max Mustermann" />
            <SampleContent />
        </Page>
    ),
};

/** A back header with a tab bar (`Page.Back` + tabs) — tabs only show when there is more than one. */
export const WithTabs: Story = {
    render: () => (
        <Page>
            <Page.Back
                path="/admin/tenants"
                title="Beispiel-Mandant"
                tabs={[
                    { to: '/admin/tenants/1/general', titleKey: 'tenant.tabs.master_data', iconName: 'master_data' },
                    { to: '/admin/tenants/1/legal', titleKey: 'tenant.tabs.legal', iconName: 'legal' },
                ]}
            />
            <SampleContent />
        </Page>
    ),
};

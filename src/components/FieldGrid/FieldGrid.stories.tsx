import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Input } from 'antd';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { Card } from '../Card';
import { FieldGrid } from './index';

const meta = {
    title: 'Molecules/FieldGrid',
    component: FieldGrid,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FieldGrid>;

export default meta;

const FIELDS = [
    'Name',
    'Postal code',
    'City',
    'Street',
    'House number',
    'Floor / building',
    'Country',
    'Phone',
    'Email',
] as const;

const DemoFields = () => (
    <>
        {FIELDS.map((label) => (
            <FloatingLabelInput key={label} label={label} />
        ))}
    </>
);

const Stage = ({ width, label, children }: { width: number | string; label: string; children: React.ReactNode }) => (
    <section style={{ marginBottom: 32 }}>
        <h3 style={{ font: "500 13px/16px 'Inter Variable', sans-serif", color: '#444748', margin: '0 0 8px' }}>
            {label}
        </h3>
        <div style={{ width, maxWidth: '100%' }}>{children}</div>
    </section>
);

/**
 * One identical card at three container widths: the SAME markup renders 1, 2
 * and 3 columns purely from the available width — the layout floor
 * (`minColumnWidth`) decides, never a media query or per-page override.
 */
export const ResponsiveColumns: StoryObj = {
    render: () => (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ minHeight: '100vh', padding: 32, background: 'var(--admin-workspace-background, #e4e2e2)' }}>
                <Stage width={380} label="380px container → 1 column (mobile stacking)">
                    <Card titleKey="General information" autoHeight dialogContentPadding variant="dialog">
                        <FieldGrid>
                            <DemoFields />
                        </FieldGrid>
                    </Card>
                </Stage>

                <Stage width={720} label="720px container → 2 columns">
                    <Card titleKey="General information" autoHeight dialogContentPadding variant="dialog">
                        <FieldGrid>
                            <DemoFields />
                        </FieldGrid>
                    </Card>
                </Stage>

                <Stage width={1080} label="1080px container → 3 columns (tall content spreads out)">
                    <Card titleKey="General information" autoHeight dialogContentPadding variant="dialog">
                        <FieldGrid>
                            <DemoFields />
                        </FieldGrid>
                    </Card>
                </Stage>
            </div>
        </ConfigProvider>
    ),
};

/**
 * Wide content (rich-text editor, description textarea) opts out of the raster
 * with `FieldGrid.Wide` and takes the full row — mixed freely with columns.
 */
export const WithWideContent: StoryObj = {
    render: () => (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ minHeight: '100vh', padding: 32, background: 'var(--admin-workspace-background, #e4e2e2)' }}>
                <Stage width={1080} label="Columns + full-width editor row">
                    <Card titleKey="General information" autoHeight dialogContentPadding variant="dialog">
                        <FieldGrid>
                            <FloatingLabelInput label="Name" />
                            <FloatingLabelInput label="Postal code" />
                            <FloatingLabelInput label="City" />
                            <FieldGrid.Wide>
                                <FloatingLabelInput
                                    label="Description (full-width editor slot)"
                                    component={Input.TextArea}
                                />
                            </FieldGrid.Wide>
                            <FloatingLabelInput label="Phone" />
                            <FloatingLabelInput label="Email" />
                        </FieldGrid>
                    </Card>
                </Stage>
            </div>
        </ConfigProvider>
    ),
};

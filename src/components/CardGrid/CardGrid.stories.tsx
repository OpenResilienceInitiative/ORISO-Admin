import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { Card } from '../Card';
import { FieldGrid } from '../FieldGrid';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { M3Button } from '../M3Button';
import { ReactComponent as TenantIcon } from '../../resources/img/svg/TenantIcon.svg';
import { ReactComponent as PersonIcon } from '../../resources/img/svg/person.svg';
import { CardGrid } from './index';

const meta = {
    title: 'Molecules/CardGrid',
    component: CardGrid,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CardGrid>;

export default meta;

const TenantCard = () => (
    <Card
        titleKey="Träger"
        headerIcon={<TenantIcon />}
        subTitle="Core organisation data: name, subdomain and licensing. This is what the platform bills and routes by."
        autoHeight
        dialogContentPadding
        variant="dialog"
        fullHeight
    >
        <FieldGrid>
            <FloatingLabelInput label="Name" />
            <FloatingLabelInput label="Subdomain" />
            <FloatingLabelInput label="Licensed consultants" />
            <FloatingLabelInput label="Address" />
        </FieldGrid>
    </Card>
);

const AdminCard = () => (
    <Card
        titleKey="Träger-Admin"
        headerIcon={<PersonIcon />}
        subTitle="First admin account for this organisation. Credentials are handed over once — the admin changes them at first login."
        autoHeight
        dialogContentPadding
        variant="dialog"
        fullHeight
        footer={
            <>
                <M3Button>Abbrechen</M3Button>
                <M3Button>Speichern</M3Button>
            </>
        }
    >
        <FieldGrid>
            <FloatingLabelInput label="Username" />
            <FloatingLabelInput label="Email" />
            <FloatingLabelInput label="First name" />
            <FloatingLabelInput label="Last name" />
        </FieldGrid>
    </Card>
);

const Stage = ({ width, label, children }: { width: number | string; label: string; children: React.ReactNode }) => (
    <section style={{ marginBottom: 40 }}>
        <h3 style={{ font: "500 13px/16px 'Inter Variable', sans-serif", color: '#444748', margin: '0 0 8px' }}>
            {label}
        </h3>
        <div style={{ width, maxWidth: '100%' }}>{children}</div>
    </section>
);

/**
 * The Neu-Träger create pair at three container widths: side by side while both
 * cards keep `minCardWidth`, wrapped onto separate rows when they no longer fit
 * — a row with a single card is fine. Fixed page zones (search + tabs above,
 * footer below) are never squeezed, because cards yield by wrapping.
 */
export const WizardPair: StoryObj = {
    render: () => (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ minHeight: '100vh', padding: 32, background: 'var(--admin-workspace-background, #e4e2e2)' }}>
                <Stage width={1000} label="1000px container → both cards share the row">
                    <CardGrid>
                        <TenantCard />
                        <AdminCard />
                    </CardGrid>
                </Stage>

                <Stage width={640} label="640px container → below 2×minCardWidth: cards wrap onto own rows">
                    <CardGrid>
                        <TenantCard />
                        <AdminCard />
                    </CardGrid>
                </Stage>
            </div>
        </ConfigProvider>
    ),
};

/** Three cards at a two-column width: 2 + 1 — the lone card in the last row is intended. */
export const ThreeCardsWrap: StoryObj = {
    render: () => (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ minHeight: '100vh', padding: 32, background: 'var(--admin-workspace-background, #e4e2e2)' }}>
                <Stage width={1000} label="1000px container, 3 cards → 2 + 1">
                    <CardGrid>
                        <TenantCard />
                        <AdminCard />
                        <TenantCard />
                    </CardGrid>
                </Stage>
            </div>
        </ConfigProvider>
    ),
};

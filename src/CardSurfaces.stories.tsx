import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';

import { buildAdminAntdTheme } from './theme/antdM3Theme';
import { Card } from './components/Card';
import { CardEditable } from './components/CardEditable';
// The parallel, hand-rolled card surface used by the Functionality-Access page.
// Imported here with its real classes so the gallery shows the duplication honestly.
import permissionStyles from './components/Tenants/AppSettings/PermissionsSettings/styles.module.scss';

/**
 * Card-surface inventory for the admin (#card-surfaces). Every card the app
 * renders is shown here on the REAL workspace background
 * (--admin-workspace-background #e4e2e2) — the same trick the Field Tokens
 * foundation uses — so surface contrast, border and elevation are reviewable in
 * context instead of on Storybook's white canvas.
 *
 * The point of the gallery: audit which cards share a primitive and which drift.
 *   1. <Card>          — the shared component (default + dialog variants)
 *   2. <CardEditable>  — REUSES <Card> internally + an edit/save footer ✅
 *   3. .chatTypeCard   — a hand-rolled surface in PermissionsSettings styles ⚠️
 * Only .chatTypeCard is a true duplicate surface; it is the one that must be
 * folded back into <Card> so a single shadow/border decision covers everything.
 */

const labelStyle: React.CSSProperties = {
    font: "500 12px/16px 'Inter', sans-serif",
    color: '#444748',
    margin: '0 0 8px',
};

const Column = ({ label, note, children }: { label: string; note: string; children: React.ReactNode }) => (
    <div style={{ width: 360, display: 'flex', flexDirection: 'column' }}>
        <div style={labelStyle}>
            {label} <span style={{ color: '#8a8d8e' }}>— {note}</span>
        </div>
        {children}
    </div>
);

/** Cards rendered on the real workspace background so surface/border/shadow read as they do in the app. */
const Workspace = ({ children }: { children: React.ReactNode }) => (
    <ConfigProvider theme={buildAdminAntdTheme()}>
        <div
            style={{
                display: 'flex',
                gap: 32,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                padding: 32,
                minHeight: '100vh',
                background: 'var(--admin-workspace-background, #e4e2e2)',
            }}
        >
            {children}
        </div>
    </ConfigProvider>
);

const meta: Meta = {
    title: 'Foundations/Card Surfaces',
    parameters: { layout: 'fullscreen' },
};

export default meta;

export const Inventory: StoryObj = {
    render: () => (
        <Workspace>
            <Column label="Card — default" note="component .card ✅ reused">
                <Card titleKey="General information" headerIcon="📄">
                    Master-Data cards use this. Flat gray surface + M3 elevation-1 shadow, so it separates from the
                    workspace even though the tonal gap to the page is tiny.
                </Card>
            </Column>

            <Column label="Card — dialog" note="component .dialogCard ✅ reused">
                <Card variant="dialog" dialogContentPadding titleKey="Visibility in registration" headerIcon="👁">
                    The variant actually used by the agency Master-Data deck (GeneralInformation etc.).
                </Card>
            </Column>

            <Column label="CardEditable" note="reuses <Card> ✅ + edit footer">
                <CardEditable titleKey="Counseling service settings" onSave={() => undefined} editMode={false}>
                    <div style={{ padding: 4 }}>
                        Renders &lt;Card&gt; internally, so it inherits the same surface, border and shadow — the Card
                        fix covers this card too.
                    </div>
                </CardEditable>
            </Column>

            <Column label=".chatTypeCard" note="hand-rolled in PermissionsSettings ⚠️ duplicate">
                <div className={permissionStyles.chatTypeCard} data-testid="showcase-chat-type-card">
                    <div className={permissionStyles.cardHeader}>
                        <span className={permissionStyles.cardIcon} aria-hidden>
                            💬
                        </span>
                        <h3 className={permissionStyles.cardTitle}>Case handover</h3>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        Functionality-Access cards use this. Still has its own border + elevation — this is the surface{' '}
                        <code>c8fac8a</code> did NOT touch, which is why these looked fine while Master-Data cards went
                        pale.
                    </div>
                </div>
            </Column>
        </Workspace>
    ),
};

const featureBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
        <div>Enabled ✔</div>
        <div style={{ color: '#444748' }}>One-on-one conversations between seekers and counselors.</div>
        <div style={{ borderTop: '1px solid rgb(0 0 0 / 12%)', paddingTop: 12, fontSize: 12, letterSpacing: 1 }}>
            CONFIGURABLE ADDITIONAL FUNCTIONS
        </div>
        <div>Video calls · Audio calls · Voice messages · Threads</div>
    </div>
);

/**
 * Before/after for folding .chatTypeCard into <Card>. The surfaces now match
 * (both have border + elevation-1), so the ONLY open decision is the title:
 * .chatTypeCard uses a 22px/700 <h3>; <Card> renders a smaller antd Title. If
 * the smaller title is acceptable, the migration is a clean swap; if not, <Card>
 * needs a "feature" title size before the Functionality-Access cards move over.
 */
export const ChatTypeMigration: StoryObj = {
    render: () => (
        <Workspace>
            <Column label="Today — .chatTypeCard" note="hand-rolled surface + 22px/700 title">
                <div className={permissionStyles.chatTypeCard}>
                    <div className={permissionStyles.cardHeader}>
                        <span className={permissionStyles.cardIcon} aria-hidden>
                            💬
                        </span>
                        <h3 className={permissionStyles.cardTitle}>1 on 1 consultations</h3>
                    </div>
                    {featureBody}
                </div>
            </Column>

            <Column label="Proposed — <Card>" note="shared surface, Card's own title size">
                <Card titleKey="1 on 1 consultations" headerIcon="💬">
                    {featureBody}
                </Card>
            </Column>
        </Workspace>
    ),
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaFormSection } from './DpaFormSection';

const section = (index: number, title: string) =>
    `<h2>§ ${index} ${title}</h2>${Array.from(
        { length: 4 },
        () =>
            `<p>Die Vertragsparteien vereinbaren, dass sämtliche personenbezogenen Daten ausschließlich zur Erfüllung des vereinbarten Zwecks verarbeitet werden. Technische und organisatorische Maßnahmen sind nach Art. 32 DSGVO zu treffen, regelmäßig zu prüfen und zu dokumentieren.</p>`,
    ).join('')}`;

const LONG_MULTI_SECTION_HTML = `<h1>Auftragsverarbeitungsvertrag</h1><p>Zwischen dem Plattformbetreiber und Ihrer Organisation wird der folgende Vertrag geschlossen.</p>${[
    'Gegenstand und Dauer',
    'Art und Zweck der Verarbeitung',
    'Kategorien betroffener Personen',
    'Pflichten des Auftragnehmers',
    'Technische und organisatorische Maßnahmen',
    'Unterauftragsverhältnisse',
    'Rechte der betroffenen Personen',
    'Löschung und Rückgabe',
    'Nachweise und Kontrollen',
    'Haftung und Schlussbestimmungen',
]
    .map((title, i) => section(i + 1, title))
    .join('')}`;

const InteractiveSection = ({ scrollMode }: { scrollMode: 'inner' | 'container' }) => {
    const [accepted, setAccepted] = useState(false);
    const [touched, setTouched] = useState(false);
    const [form] = Form.useForm();

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                initialValues={{ signerName: '', signerPosition: '', signerEmail: '', signerOrganisation: '' }}
            >
                <DpaFormSection
                    dpaHtml={LONG_MULTI_SECTION_HTML}
                    textLabel="Auftragsverarbeitungsvertrag"
                    scrollMode={scrollMode}
                    accepted={accepted}
                    acceptTouched={touched}
                    onAcceptedChange={(value) => {
                        setAccepted(value);
                        setTouched(true);
                    }}
                />
            </Form>
        </ThemeProvider>
    );
};

/**
 * The ONE shared DPA/AVV form block (#569 hardening) used by the U8 tenant
 * onboarding DPA step and the U10 global DPA blocker. Long legal texts get
 * in-document anchor navigation generated from the section headings: a side
 * TOC when the host column is wide enough (container query), a compact
 * jump-to-section dropdown on narrow layouts (390x844). Jumps smooth-scroll
 * inside the scrollable text region and move keyboard focus to the section.
 */
const meta = {
    title: 'Molecules/DpaLegalForm',
    component: DpaFormSection,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof DpaFormSection>;

export default meta;
// render-only stories (interactive local state) — no meta-typed args needed
type Story = StoryObj;

/** Desktop, wide host column: sticky side TOC next to the capped scroll box. */
export const DesktopLongTextSideToc: Story = {
    render: () => (
        <div style={{ width: 'min(820px, 94vw)', padding: '16px 0' }}>
            <InteractiveSection scrollMode="inner" />
        </div>
    ),
};

/**
 * Narrow host column at 390x844: the TOC collapses to the compact
 * jump-to-section dropdown; the text keeps its own scroll region.
 */
export const MobileLongTextCompactToc: Story = {
    render: () => (
        <div style={{ width: 'min(520px, 94vw)', padding: '16px 0' }}>
            <InteractiveSection scrollMode="inner" />
        </div>
    ),
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};

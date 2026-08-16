import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Where the M3 Rich Text Editor should be adopted next, and what each surface needs.
 * Written down here rather than in a ticket so it sits next to the component it is
 * about — the inventory below was taken from the code, not from memory.
 */
const meta = {
    title: 'Organisms/M3 Rich Text Editor/Rollout Plan',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Surface = {
    name: string;
    path: string;
    today: string;
    verdict: 'adopted' | 'candidate' | 'out';
    note: string;
};

const SURFACES: Surface[] = [
    {
        name: 'Legal texts — imprint, privacy, DPA',
        path: 'components/Tenants/LegalSettings/*',
        today: 'M3 Rich Text Editor',
        verdict: 'adopted',
        note: 'The reference implementation: per-language content map, help text, blocker and success snackbars, version split button, department selector, device-local draft.',
    },
    {
        name: 'Agency legal texts',
        path: 'pages/Agency/Edit/components/LegalTextSettings',
        today: 'M3 Rich Text Editor',
        verdict: 'adopted',
        note: 'Already on the editor via AgencyLegalTextContainer, including the Fachbereich split button in the lower function bar.',
    },
    {
        name: 'E-mail templates',
        path: 'pages/Links/EmailTemplatesDialog.tsx:424',
        today: 'antd Input.TextArea, rows={8}',
        verdict: 'candidate',
        note: 'Strongest case: the body is sent as HTML and carries placeholders, which the editor already supports via its placeholders dropdown. Check first how this relates to the e-mail design system (Storybook Email/*) and the four send paths — the editor must not fight the template renderer.',
    },
    {
        name: 'Case handover — system notification',
        path: '…/PermissionsSettings/CaseHandoverCard/CaseHandoverCardView.tsx:278',
        today: 'raw <textarea>, rows={3}',
        verdict: 'candidate',
        note: 'Already per-language, so it needs exactly the language handling the editor brings. Smallest, most self-contained migration — a good first one. Keep it short: three rows of plain notification text may not want a full toolbar.',
    },
    {
        name: 'Topic description',
        path: 'pages/Topics/Edit/index.tsx:77',
        today: 'FormTextAreaField',
        verdict: 'candidate',
        note: 'Lowest urgency. Decide whether the description is rendered as HTML anywhere before adding formatting an admin can use but the frontend then escapes.',
    },
    {
        name: 'Kitchen / demo cards',
        path: 'components/cards/* (BatchMode, CaseTakeover, PersonalInfo, Success)',
        today: 'antd Input.TextArea',
        verdict: 'out',
        note: 'Not mounted anywhere under pages/ or App.tsx — Storybook/demo only. Migrating them would be work with no user-visible effect.',
    },
];

const REUSABLE = [
    [
        'EditorHintSnackbar',
        'tone="blocker" (dark, inverse) and tone="success" (blue secondary container, check affordance). The success tone carries the signed-DPA confirmation that used to be a separate alert below the card.',
    ],
    ['EditorHelpText', 'Info icon + description + bold CTA hint under the header, resolved per role and state.'],
    [
        'topicSlot / languageSlot / version split button',
        'The lower function bar takes up to three split dropdowns; DepartmentSelect is the working example.',
    ],
    [
        'useLegalDraft + LegalDraftNotice',
        'Device-local draft, scoped by tenant + document + opaque user id. Deliberately one seam, so ORISO-Admin#710 can swap localStorage for the API without touching the UI.',
    ],
];

const VERDICT_STYLE: Record<Surface['verdict'], { label: string; background: string; color: string }> = {
    adopted: {
        label: 'already on it',
        background: 'var(--m3-surface-container-high, #eae7e8)',
        color: 'var(--m3-on-surface-variant, #444748)',
    },
    candidate: { label: 'candidate', background: 'var(--m3-on-secondary-container, #e7effc)', color: '#000' },
    out: { label: 'out of scope', background: 'transparent', color: 'var(--m3-outline, #747878)' },
};

const RolloutPlan = () => (
    <div style={{ maxWidth: 900, color: 'var(--m3-on-surface, #1b1b1c)', fontSize: 14, lineHeight: 1.5 }}>
        <h2 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 4px' }}>M3 Rich Text Editor — rollout plan</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--m3-on-surface-variant, #444748)' }}>
            Every multiline text field in the admin panel, and whether the editor belongs there. Taken from the code, so
            two surfaces that looked like candidates turned out not to be: the agency legal texts already use the
            editor, and the demo cards are not mounted anywhere.
        </p>

        {SURFACES.map((surface) => {
            const style = VERDICT_STYLE[surface.verdict];
            return (
                <section
                    key={surface.path}
                    style={{
                        marginBottom: 12,
                        padding: '12px 16px',
                        border: '1px solid var(--m3-outline-variant, #c4c7c8)',
                        borderRadius: 12,
                        opacity: surface.verdict === 'out' ? 0.65 : 1,
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                        <strong style={{ flex: '1 1 260px' }}>{surface.name}</strong>
                        <span
                            style={{
                                padding: '2px 10px',
                                borderRadius: 100,
                                background: style.background,
                                color: style.color,
                                fontSize: 12,
                                border: surface.verdict === 'out' ? '1px solid currentColor' : 'none',
                            }}
                        >
                            {style.label}
                        </span>
                    </div>
                    <code
                        style={{
                            display: 'block',
                            margin: '6px 0',
                            fontSize: 12,
                            color: 'var(--m3-on-surface-variant, #444748)',
                        }}
                    >
                        {surface.path}
                    </code>
                    <div style={{ fontSize: 13, color: 'var(--m3-on-surface-variant, #444748)' }}>
                        <em>today:</em> {surface.today}
                    </div>
                    <p style={{ margin: '6px 0 0' }}>{surface.note}</p>
                </section>
            );
        })}

        <h3 style={{ fontSize: 18, fontWeight: 400, margin: '28px 0 8px' }}>What comes with the editor</h3>
        <p style={{ margin: '0 0 12px', color: 'var(--m3-on-surface-variant, #444748)' }}>
            These are the parts worth reusing in other molecules and atoms, not just inside the legal cards.
        </p>
        <dl style={{ margin: 0 }}>
            {REUSABLE.map(([name, what]) => (
                <div key={name} style={{ marginBottom: 10 }}>
                    <dt style={{ fontWeight: 600 }}>{name}</dt>
                    <dd style={{ margin: '2px 0 0', color: 'var(--m3-on-surface-variant, #444748)' }}>{what}</dd>
                </div>
            ))}
        </dl>

        <h3 style={{ fontSize: 18, fontWeight: 400, margin: '28px 0 8px' }}>
            Open questions before the first migration
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--m3-on-surface-variant, #444748)' }}>
            <li>
                Does the target store plain text today? Switching to HTML needs a read path that survives the old
                values.
            </li>
            <li>
                Is the value rendered as HTML on the receiving side, or escaped? Formatting nobody sees is worse than
                none.
            </li>
            <li>
                Does the surface need the full toolbar, or a reduced one? A three-row notification probably does not
                want image upload.
            </li>
            <li>
                Per-language already, or single value? The editor expects a language map; a single string needs a
                decision, not a default.
            </li>
        </ul>
    </div>
);

export const RolloutTargets: Story = {
    render: () => <RolloutPlan />,
};

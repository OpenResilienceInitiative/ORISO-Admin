import classNames from 'classnames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styles from './M3RichTextEditorRollout.module.scss';

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
        note: 'The reference implementation: the card owns the per-language content map and feeds the editor one string at a time, plus help text, blocker and success snackbars, version split button, department selector and the draft.',
    },
    {
        name: 'Agency legal texts',
        path: 'components/Tenants/LegalSettings/components/AgencyLegalTextContainer',
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

const VERDICT: Record<Surface['verdict'], { label: string; className: string }> = {
    adopted: { label: 'already on it', className: styles.verdictAdopted },
    candidate: { label: 'candidate', className: styles.verdictCandidate },
    out: { label: 'out of scope', className: styles.verdictOut },
};

const RolloutPlan = () => (
    <div className={styles.page}>
        <h2 className={styles.title}>M3 Rich Text Editor — rollout plan</h2>
        <p className={styles.lead}>
            Every multiline text field in the admin panel, and whether the editor belongs there. Taken from the code, so
            two surfaces that looked like candidates turned out not to be: the agency legal texts already use the
            editor, and the demo cards are not mounted anywhere.
        </p>

        {SURFACES.map((surface) => {
            const verdict = VERDICT[surface.verdict];
            return (
                <section
                    key={surface.path}
                    className={classNames(styles.surface, { [styles.surfaceOut]: surface.verdict === 'out' })}
                >
                    <div className={styles.surfaceHead}>
                        <strong className={styles.surfaceName}>{surface.name}</strong>
                        <span className={classNames(styles.verdict, verdict.className)}>{verdict.label}</span>
                    </div>
                    <code className={styles.path}>{surface.path}</code>
                    <div className={styles.today}>
                        <em>today:</em> {surface.today}
                    </div>
                    <p className={styles.note}>{surface.note}</p>
                </section>
            );
        })}

        <h3 className={styles.sectionHeading}>What comes with the editor</h3>
        <p className={styles.leadTight}>
            These are the parts worth reusing in other molecules and atoms, not just inside the legal cards.
        </p>
        <dl className={styles.reusableList}>
            {REUSABLE.map(([name, what]) => (
                <div key={name} className={styles.reusableItem}>
                    <dt className={styles.reusableName}>{name}</dt>
                    <dd className={styles.reusableWhat}>{what}</dd>
                </div>
            ))}
        </dl>

        <h3 className={styles.sectionHeading}>Open questions before the first migration</h3>
        <ul className={styles.questions}>
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
                Per-language already, or single value? The editor itself takes a single HTML <code>value</code> — the
                language map lives in the host, which picks the current string and passes <code>languages</code> /{' '}
                <code>language</code> / <code>onLanguageChange</code> to get the switcher. A surface with one value can
                adopt the editor without any of that; whether it should become multilingual is a separate decision.
            </li>
        </ul>
    </div>
);

export const RolloutTargets: Story = {
    render: () => <RolloutPlan />,
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { Page } from '../../Page';
import { CardDeck } from '../../CardDeck';
import { Card } from '../../Card';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import styles from './styles.module.scss';

/**
 * Layout-only harness for the tenant appearance (theme-settings) page. It composes
 * the real style modules and components — Page sticky header + tabs, `appearancePage`,
 * `CardDeck`, and the master-data toggle inside a real `CardEditable` (same
 * `layout="vertical"` form context as production) — WITHOUT the data hooks, so
 * mobile-layout regressions are observable in isolation:
 *   - ≥24px gap between the sticky tab bar and the first card (was flush on mobile).
 *   - the master-data toggle row must stay inside the card (no horizontal overflow).
 * Switch the toolbar viewport to mobile to check both.
 */
const meta = {
    title: 'Organisms/Pages/Tenants/AppearanceLayout',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tabs = [
    { to: '/admin/tenants/1/general', titleKey: 'Stammdaten & Mehr', iconName: 'master_data' },
    { to: '/admin/tenants/1/theme-settings', titleKey: 'Rechtliches', iconName: 'legal' },
];

const toggleInitialValues = { tenantAdminControls: { allowedPermissionToggles: { appearance: true } } };

export const Default: Story = {
    render: () => (
        <Page>
            <Page.BackWithActions path="/admin/tenants" title="Dreambau" tabs={tabs} />
            <div className={styles.appearancePage}>
                <CardDeck
                    className={styles.cardDeck}
                    ariaLabel="Erscheinungsbild"
                    previousLabel="Zurück"
                    nextLabel="Weiter"
                >
                    <CardDeck.Item className={styles.cardSlotImages}>
                        <Card autoHeight dialogContentPadding titleKey="Individuelle Bilder" variant="dialog">
                            Bitte beachten Sie, dass wir nur JPG-/PNG-Formate bis zu 500 KB annehmen können.
                        </Card>
                    </CardDeck.Item>
                    <CardDeck.Item>
                        <CardEditable
                            allowEdit={false}
                            initialValues={toggleInitialValues}
                            titleKey="Erscheinungsbild des Trägers"
                            subTitle="Legt fest, ob Träger-Admins das Erscheinungsbild selbst pflegen dürfen."
                            onSave={() => {}}
                            variant="dialog"
                            editButtonPlacement="footer"
                            headerIcon={<ManageAccountsOutlinedIcon />}
                        >
                            <FormSwitchField
                                label={
                                    <span className={styles.masterDataToggleCopy}>
                                        <span className={styles.masterDataToggleTitle}>
                                            Bearbeitung durch Träger-Admins erlauben
                                        </span>
                                        <span className={styles.masterDataToggleDescription}>
                                            Erlaubt Träger-Admins die Bearbeitung von Name, Slogan und individuellen
                                            Bildern. Ist die Option deaktiviert, bleiben diese Änderungen der Plattform
                                            vorbehalten.
                                        </span>
                                    </span>
                                }
                                name={['tenantAdminControls', 'allowedPermissionToggles', 'appearance']}
                                inline
                                disableLabels
                                className={styles.masterDataToggle}
                                switchLabel="Bearbeitung durch Träger-Admins erlauben"
                                switchVariant="m3"
                            />
                        </CardEditable>
                    </CardDeck.Item>
                </CardDeck>
            </div>
        </Page>
    ),
};

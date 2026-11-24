import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TOptions } from 'i18next';
import { useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../../../i18n';
import { toIntlLocale, type SupportedLanguage } from '../../../../../utils/language';
import { TileSections } from '../../../../TileSections';
import { SectionHelp } from '../SectionHelp';
import { directInviteHelp } from '../help';
import { PermissionsStoryFrame } from '../PermissionsStoryFrame';
import { DirectInviteSection, type DirectInviteSectionProps } from './index';

const DirectInviteTileExample = (props: DirectInviteSectionProps) => {
    const { t } = useTranslation();
    return (
        <PermissionsStoryFrame wide>
            <TileSections>
                <TileSections.Section
                    wide
                    collapsible
                    id="localized-direct-invite"
                    title={t('tenants.permissions.directInvite.title')}
                    note={t('tenants.permissions.directInvite.description')}
                    titleAction={<SectionHelp topic={directInviteHelp} />}
                >
                    <DirectInviteSection {...props} />
                </TileSections.Section>
            </TileSections>
        </PermissionsStoryFrame>
    );
};

const LocalizedTile = ({ language, args }: { language: SupportedLanguage; args: DirectInviteSectionProps }) => {
    const locale = useMemo(() => i18n.cloneInstance({ lng: language, fallbackLng: false }), [language]);
    return (
        <I18nextProvider i18n={locale}>
            <DirectInviteTileExample {...args} />
        </I18nextProvider>
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/DirectInviteLanguages',
    component: DirectInviteSection,
    parameters: { layout: 'padded' },
    args: { restrictedFields: new Set<string>(), policyLevel: 'platform' },
} satisfies Meta<typeof DirectInviteSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const localized = (language: SupportedLanguage): Story => ({
    render: (args) => <LocalizedTile language={language} args={args} />,
    beforeEach: () => {
        // The help dialog is portalled outside the story canvas.
        const previous = document.documentElement.lang;
        document.documentElement.lang = toIntlLocale(language) ?? language;
        return () => {
            document.documentElement.lang = previous;
        };
    },
    play: async ({ canvasElement }) => {
        const translate = i18n.getFixedT(language);
        const t = (key: string, options?: TOptions) => translate<string>(key, options);
        const title = t('tenants.permissions.directInvite.title');
        const tile = within(canvasElement).getByRole('group', { name: title });
        const controls = within(tile);
        await expect(controls.getByText(t('tenants.permissions.directInvite.description'))).toBeVisible();
        const state = t('tenants.permissions.policy.activated');
        const action = t('tenants.permissions.policy.deactivate');
        await Promise.all(
            ['chat', 'audio', 'video'].map((medium) => {
                const name = t(`tenants.permissions.directInvite.${medium}`);
                return expect(controls.getByRole('button', { name: `${name}: ${state} – ${action}` })).toBeVisible();
            }),
        );
        await expect(document.documentElement).toHaveAttribute('lang', toIntlLocale(language) ?? language);
        await userEvent.click(controls.getByRole('button', { name: t('tileHelp.open', { title }) }));
        const dialog = within(await screen.findByRole('dialog'));
        await waitFor(() => expect(dialog.getByText(t('tileHelp.directInvite.essence'))).toBeVisible());
        await userEvent.click(dialog.getByRole('button', { name: t('tileHelp.next') }));
        await expect(dialog.getByText(t('tileHelp.directInvite.visible.body'))).toBeVisible();
        await expect(dialog.getByText(t('tileHelp.progress', { current: 2, total: 2 }))).toBeVisible();
        const relatedTitle = t('tileHelp.permissionLevels.title');
        await userEvent.click(dialog.getByRole('button', { name: t('tileHelp.seeAlso', { title: relatedTitle }) }));
        await expect(dialog.getByText(t('tileHelp.permissionLevels.essence'))).toBeVisible();
        await userEvent.click(dialog.getByRole('button', { name: t('tileHelp.next') }));
        await userEvent.click(dialog.getByRole('button', { name: t('tileHelp.next') }));
        await expect(dialog.getByText(t('tileHelp.permissionLevels.centre.body'))).toBeVisible();
        await userEvent.click(dialog.getByRole('button', { name: t('tileHelp.done') }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    },
});

export const German = localized('de');
export const InformalGerman = localized('de@informal');
export const English = localized('en');
export const French = localized('fr');
export const Russian = localized('ru');
export const Turkish = localized('tr');
export const Tigrinya = localized('ti');

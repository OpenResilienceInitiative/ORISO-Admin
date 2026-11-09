import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import AddRounded from '@mui/icons-material/AddRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import buttonStyles from '../../components/M3Button/styles.module.scss';
import { NavGlyph } from '../../components/NavGlyph';
import { tabIcons } from '../../components/Page';
import welcomePicture from '../../resources/img/tile-help/conversation.webp';
import { useAdminNavigation } from '../../components/Layout/useAdminNavigation';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { useUserData } from '../../hooks/useUserData.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { resolveInviteViewerScope, resolveVisibleLinksTabs } from '../../constants/linksAccess';
import { invitableRoles } from '../Links/inviteRules';
import {
    buildChecklist,
    buildHomeTiles,
    groupSettingsTabs,
    HOME_SECTIONS,
    mailServerStatus,
    pickHeroAction,
    resolveHomeRole,
    type HomeFacts,
    type HomeTile,
    type HomeTileLink,
} from './homeModel';
import { useHomeFacts } from './useHomeFacts';
import { HomeIntroVideo } from './HomeIntroVideo';
import styles from './home.module.scss';

type Translate = (key: string, options?: object) => string;

/** "1 Beratungsstelle", not "1 Beratungsstellen": the singular has its own key. */
const countText = (t: Translate, key: string, count: number) => t(count === 1 ? `${key}.one` : key, { count });

/** The live facts a tile footer shows; only counts that loaded. Row counts sit on their rows. */
const factsFor = (tile: HomeTile, facts: HomeFacts, t: Translate) =>
    tile.id === 'invite' && typeof facts.openInvites === 'number'
        ? [countText(t, 'home.fact.openInvites', facts.openInvites)]
        : [];

const STATISTICS_PREVIEW = ['requests', 'conversations', 'topics', 'tutorials'] as const;

/**
 * Start page for every admin (ORISO-Admin#1323, docs/home-dashboard-spec.md):
 * a short explanation of how the panel is organised, the next setup steps,
 * and one tile per area this admin can open.
 */
export const HomePage = () => {
    const { t } = useTranslation();
    const { navItems, settingsTabs, tree } = useAdminNavigation();
    const { isSuperAdmin, isTenantScopedAdmin, hasRole, tenantId } = useUserRoles();
    const { can } = useUserPermissions();
    const { data: userData } = useUserData();
    const role = resolveHomeRole({ isSuperAdmin, isTenantScopedAdmin, hasRole });
    const linksTabs = resolveVisibleLinksTabs({ isSuperAdmin, hasRole });

    const facts = useHomeFacts({
        role,
        tenantId,
        canReadTenants: can(PermissionAction.Read, Resource.Tenant),
        canReadAgencies: can(PermissionAction.Read, Resource.Agency),
        canReadConsultants: can(PermissionAction.Read, Resource.Consultant),
        canInviteTenants: isSuperAdmin && linksTabs.includes('tenants'),
        canInviteCounsellors: linksTabs.includes('counsellor'),
    });

    const tiles = buildHomeTiles({
        role,
        navItems,
        tree,
        canCreateAgency: can(PermissionAction.Create, Resource.Agency),
        canInviteAgencyAdmins: invitableRoles(
            resolveInviteViewerScope({ isSuperAdmin, hasRole }),
            'counsellor',
        ).includes('AGENCY_ADMIN'),
    });
    const heroAction = pickHeroAction(role, tiles);
    const steps = buildChecklist(
        role,
        facts,
        navItems,
        settingsTabs.map((tab) => tab.to),
    );
    const doneCount = steps.filter((step) => step.state === 'done').length;
    const showChecklist = steps.length > 0 && doneCount < steps.length;
    // The first step still to do leads; unknown steps never do (we cannot tell they are open).
    const currentStepId = steps.find((step) => step.state === 'open')?.id;
    const settingsGroups = groupSettingsTabs(settingsTabs, role);
    const mailStatus = mailServerStatus(facts.ownTenant);
    const firstName = typeof userData?.firstName === 'string' ? userData.firstName.trim() : '';

    const renderShortcut = (link: HomeTileLink) => {
        const count = link.count ? facts[link.count] : undefined;
        const secondary = link.descriptionKey
            ? t(link.descriptionKey)
            : link.detailKeys?.map((key) => t(key)).join(' · ');

        return (
            <li key={link.id} data-separated={link.separated || undefined}>
                <Link className={styles.tileShortcut} to={link.to} data-kind={link.kind}>
                    {link.kind === 'add' && <AddRounded className={styles.shortcutIcon} aria-hidden />}
                    {link.kind === 'open' && link.glyph && (
                        <span className={styles.shortcutIcon} aria-hidden>
                            <NavGlyph name={link.glyph} size={20} />
                        </span>
                    )}
                    <span className={styles.shortcutText}>
                        <span className={styles.shortcutLabel}>
                            {t(link.labelKey, link.fallbackKey ? t(link.fallbackKey) : undefined)}
                        </span>
                        {secondary && <span className={styles.shortcutDescription}>{secondary}</span>}
                    </span>
                    {typeof count === 'number' && <span className={styles.shortcutCount}>{count}</span>}
                    {link.kind === 'open' && <ChevronRightIcon className={styles.chevron} aria-hidden />}
                </Link>
            </li>
        );
    };

    const renderTile = (tile: HomeTile) => {
        const lines = factsFor(tile, facts, t);
        const needsAction = tile.id === 'invite' ? facts.needsActionInvites ?? 0 : 0;

        return (
            <li key={tile.id} className={styles.tileItem} data-tile={tile.id}>
                <div className={styles.tile}>
                    <Link className={styles.tileLink} to={tile.to}>
                        <span className={styles.tileIcon} aria-hidden>
                            {tile.id === 'invite' ? <MailOutlineRounded /> : <NavGlyph name={tile.glyph} />}
                        </span>
                        <h3 className={styles.tileTitle}>{t(tile.titleKey)}</h3>
                        {needsAction > 0 && (
                            <span className={styles.badge}>{countText(t, 'home.fact.needsAction', needsAction)}</span>
                        )}
                        {tile.id === 'statistics' && (
                            <span className={styles.tileHeaderAction}>{t('home.tile.statistics.allFigures')}</span>
                        )}
                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                    </Link>
                    <p className={styles.tileText}>{t(tile.textKey)}</p>
                    {tile.links.length > 0 && <ul className={styles.tileLinks}>{tile.links.map(renderShortcut)}</ul>}
                    {tile.id === 'statistics' && (
                        <>
                            {/* Home loads no statistics: the chips name what the page shows, without a made-up value. */}
                            <ul className={styles.statisticsPreview}>
                                {STATISTICS_PREVIEW.map((item) => (
                                    <li key={item}>
                                        <span className={styles.kpiLabel}>
                                            {t(`home.tile.statistics.contents.${item}`)}
                                        </span>
                                        <span className={styles.kpiValue} aria-hidden>
                                            –
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className={styles.kpiNote}>{t('home.tile.statistics.where')}</p>
                        </>
                    )}
                    {tile.id === 'settings' && settingsGroups.length > 0 && (
                        <div className={styles.settingsGroups}>
                            {settingsGroups.map((group) => (
                                <section
                                    key={group.id}
                                    className={styles.settingsGroup}
                                    aria-labelledby={`home-settings-${group.id}`}
                                >
                                    <h4 className={styles.settingsGroupTitle} id={`home-settings-${group.id}`}>
                                        {t(group.titleKey)}
                                    </h4>
                                    <ul className={styles.tileLinks}>
                                        {group.items.map((item) => {
                                            const Icon = item.iconName ? tabIcons[item.iconName] : undefined;
                                            const status = item.isMailServer ? mailStatus : undefined;

                                            return (
                                                <li key={item.to}>
                                                    <Link className={styles.tileShortcut} to={item.to} data-kind="open">
                                                        {Icon && <Icon className={styles.shortcutIcon} aria-hidden />}
                                                        <span className={styles.shortcutText}>
                                                            <span className={styles.shortcutLabel}>
                                                                {t(item.labelKey)}
                                                            </span>
                                                            {item.descriptionKey && (
                                                                <span className={styles.shortcutDescription}>
                                                                    {t(item.descriptionKey)}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {status && (
                                                            <span className={styles.statusChip} data-status={status}>
                                                                {t(`home.settings.mailServer.${status}`)}
                                                            </span>
                                                        )}
                                                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    )}
                    {lines.length > 0 && (
                        <ul className={styles.facts}>
                            {lines.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </li>
        );
    };

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <div className={styles.heroText}>
                    <span className={styles.roleChip}>{t(`home.role.${role}`)}</span>
                    <h1 className={styles.title}>
                        {firstName ? t('home.greeting.named', { name: firstName }) : t('home.greeting')}
                    </h1>
                    <p className={styles.intro}>{t(`home.intro.${role}`)}</p>
                    {heroAction && (
                        <div className={styles.heroActions}>
                            <Link
                                className={classNames(buttonStyles.button, buttonStyles.filled, styles.heroAction)}
                                to={heroAction.to}
                            >
                                <span className={buttonStyles.icon} aria-hidden>
                                    {heroAction.kind === 'invite' ? <MailOutlineRounded /> : <AddRounded />}
                                </span>
                                {t(heroAction.labelKey)}
                            </Link>
                        </div>
                    )}
                </div>
                <img className={styles.heroPicture} src={welcomePicture} alt="" aria-hidden />
            </header>

            <div className={styles.startRow}>
                {showChecklist && (
                    <section className={styles.checklist} aria-labelledby="home-checklist-title">
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle} id="home-checklist-title">
                                {t('home.checklist.title')}
                            </h2>
                            <span className={styles.progress}>
                                {t('home.checklist.progress', { done: doneCount, total: steps.length })}
                            </span>
                        </div>
                        <div
                            className={styles.progressBar}
                            role="progressbar"
                            aria-labelledby="home-checklist-title"
                            aria-valuemin={0}
                            aria-valuemax={steps.length}
                            aria-valuenow={doneCount}
                        >
                            <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
                        </div>
                        <ol className={styles.steps}>
                            {steps.map((step, index) => {
                                const current = step.id === currentStepId;
                                const hint = t(`${step.labelKey}.hint`);

                                return (
                                    <li key={step.id}>
                                        <Link
                                            className={styles.step}
                                            to={step.to}
                                            data-state={step.state}
                                            data-current={current || undefined}
                                            aria-current={current ? 'step' : undefined}
                                        >
                                            <span className={styles.stepMarker} aria-hidden>
                                                {step.state === 'done' && <CheckRounded fontSize="inherit" />}
                                                {step.state === 'open' && index + 1}
                                                {step.state === 'unknown' && <HelpOutlineIcon fontSize="inherit" />}
                                            </span>
                                            <span className={styles.stepText}>
                                                <span className={styles.stepLabel}>{t(step.labelKey)}</span>
                                                <span className={styles.stepHint}>
                                                    {/* The hints say why a step matters; once done, "done" is all there is to say. */}
                                                    {step.state === 'done' ? t('home.checklist.doneHint') : hint}
                                                </span>
                                            </span>
                                            {step.state === 'unknown' && (
                                                <span className={styles.visuallyHidden}>
                                                    {t('home.checklist.unknown')}
                                                </span>
                                            )}
                                            {current && (
                                                <span className={styles.stepNext}>{t('home.checklist.next')}</span>
                                            )}
                                            {!current && step.state !== 'done' && (
                                                <ChevronRightIcon className={styles.chevron} aria-hidden />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                )}
                <HomeIntroVideo />
            </div>

            {HOME_SECTIONS.map((section) => {
                const sectionTiles = tiles.filter((tile) => tile.section === section);

                if (sectionTiles.length === 0) {
                    return null;
                }

                return (
                    <section key={section} className={styles.section} aria-labelledby={`home-section-${section}`}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle} id={`home-section-${section}`}>
                                {t(`home.section.${section}.title`)}
                            </h2>
                            <p className={styles.sectionText}>{t(`home.section.${section}.text`)}</p>
                        </div>
                        <ul className={styles.tiles} data-section={section}>
                            {sectionTiles.map(renderTile)}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
};

export default HomePage;

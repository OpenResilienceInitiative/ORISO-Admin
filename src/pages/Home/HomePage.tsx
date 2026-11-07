import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddRounded from '@mui/icons-material/AddRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import { NavGlyph } from '../../components/NavGlyph';
import { tabIcons } from '../../components/Page';
import welcomePicture from '../../resources/img/tile-help/conversation.webp';
import { useAdminNavigation } from '../../components/Layout/useAdminNavigation';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { useUserData } from '../../hooks/useUserData.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { resolveVisibleLinksTabs } from '../../constants/linksAccess';
import {
    buildChecklist,
    buildHomeTiles,
    groupSettingsTabs,
    HOME_SECTIONS,
    resolveHomeRole,
    type HomeFacts,
    type HomeTile,
} from './homeModel';
import { useHomeFacts } from './useHomeFacts';
import { HomeIntroVideo } from './HomeIntroVideo';
import styles from './home.module.scss';

/** The live facts a tile shows; only counts that loaded. */
const factsFor = (tile: HomeTile, facts: HomeFacts, t: (key: string, options?: object) => string) => {
    const lines: string[] = [];
    // Singular has its own key: "1 Beratungsstelle", not "1 Beratungsstellen".
    const add = (key: string, count?: number) => {
        if (typeof count === 'number') lines.push(t(count === 1 ? `${key}.one` : key, { count }));
    };

    if (tile.id === 'organisation') {
        add('home.fact.tenants', tile.to.endsWith('/tenants') ? facts.tenants : undefined);
        add('home.fact.agencies', facts.agencies);
    }
    if (tile.id === 'invite') {
        add('home.fact.openInvites', facts.openInvites);
        if (facts.needsActionInvites) add('home.fact.needsAction', facts.needsActionInvites);
    }
    if (tile.id === 'accounts') {
        add('home.fact.consultants', facts.consultants);
    }

    return lines;
};

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
    });
    const steps = buildChecklist(
        role,
        facts,
        navItems,
        settingsTabs.map((tab) => tab.to),
    );
    const doneCount = steps.filter((step) => step.state === 'done').length;
    const showChecklist = steps.length > 0 && doneCount < steps.length;
    const settingsGroups = groupSettingsTabs(settingsTabs);
    const firstName = typeof userData?.firstName === 'string' ? userData.firstName.trim() : '';

    const renderTile = (tile: HomeTile) => {
        const lines = factsFor(tile, facts, t);

        return (
            <li key={tile.id} className={styles.tileItem} data-tile={tile.id}>
                <div className={styles.tile}>
                    <Link className={styles.tileLink} to={tile.to}>
                        <span className={styles.tileIcon} aria-hidden>
                            {tile.id === 'invite' ? <MailOutlineRounded /> : <NavGlyph name={tile.glyph} />}
                        </span>
                        <h3 className={styles.tileTitle}>{t(tile.titleKey)}</h3>
                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                    </Link>
                    <p className={styles.tileText}>{t(tile.textKey)}</p>
                    {tile.links.length > 0 && (
                        <ul className={styles.tileLinks}>
                            {tile.links.map((link) => (
                                <li key={link.id}>
                                    <Link className={styles.tileShortcut} to={link.to} data-kind={link.kind}>
                                        {link.kind === 'add' && (
                                            <AddRounded className={styles.shortcutIcon} aria-hidden />
                                        )}
                                        <span className={styles.shortcutLabel}>
                                            {t(link.labelKey, link.fallbackKey ? t(link.fallbackKey) : undefined)}
                                        </span>
                                        {link.kind === 'open' && (
                                            <ChevronRightIcon className={styles.chevron} aria-hidden />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {tile.id === 'statistics' && (
                        <ul className={styles.statisticsPreview}>
                            {(['requests', 'conversations', 'topics', 'tutorials'] as const).map((item) => (
                                <li key={item}>{t(`home.tile.statistics.contents.${item}`)}</li>
                            ))}
                        </ul>
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

                                            return (
                                                <li key={item.to}>
                                                    <Link className={styles.tileShortcut} to={item.to} data-kind="open">
                                                        {Icon && <Icon className={styles.shortcutIcon} aria-hidden />}
                                                        <span className={styles.shortcutLabel}>{t(item.labelKey)}</span>
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
                            {steps.map((step) => (
                                <li key={step.id}>
                                    <Link className={styles.step} to={step.to} data-state={step.state}>
                                        {step.state === 'done' && <CheckCircleIcon className={styles.stepIcon} />}
                                        {step.state === 'open' && (
                                            <RadioButtonUncheckedIcon className={styles.stepIcon} />
                                        )}
                                        {step.state === 'unknown' && <HelpOutlineIcon className={styles.stepIcon} />}
                                        <span className={styles.stepText}>
                                            <span className={styles.stepLabel}>{t(step.labelKey)}</span>
                                            <span className={styles.stepHint}>{t(`${step.labelKey}.hint`)}</span>
                                        </span>
                                        {step.state === 'done' && (
                                            <span className={styles.visuallyHidden}>{t('home.checklist.done')}</span>
                                        )}
                                        {step.state === 'unknown' && (
                                            <span className={styles.visuallyHidden}>{t('home.checklist.unknown')}</span>
                                        )}
                                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                                    </Link>
                                </li>
                            ))}
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

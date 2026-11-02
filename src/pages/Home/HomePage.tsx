import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { NavGlyph } from '../../components/NavGlyph';
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
    resolveHomeRole,
    type HomeFacts,
    type HomeTile,
} from './homeModel';
import { useHomeFacts } from './useHomeFacts';
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
    const { navItems, settingsTabs } = useAdminNavigation();
    const { isSuperAdmin, isTenantScopedAdmin, hasRole } = useUserRoles();
    const { can } = useUserPermissions();
    const { data: userData } = useUserData();
    const role = resolveHomeRole({ isSuperAdmin, isTenantScopedAdmin, hasRole });
    const linksTabs = resolveVisibleLinksTabs({ isSuperAdmin, hasRole });

    const facts = useHomeFacts({
        role,
        canReadTenants: can(PermissionAction.Read, Resource.Tenant),
        canReadAgencies: can(PermissionAction.Read, Resource.Agency),
        canReadConsultants: can(PermissionAction.Read, Resource.Consultant),
        canInviteTenants: isSuperAdmin && linksTabs.includes('tenants'),
        canInviteCounsellors: linksTabs.includes('counsellor'),
    });

    const tiles = buildHomeTiles({ role, navItems });
    const steps = buildChecklist(role, facts, navItems);
    const doneCount = steps.filter((step) => step.state === 'done').length;
    const showChecklist = steps.length > 0 && doneCount < steps.length;
    const settingsGroups = groupSettingsTabs(settingsTabs);
    const firstName = typeof userData?.firstName === 'string' ? userData.firstName.trim() : '';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    {firstName ? t('home.greeting.named', { name: firstName }) : t('home.greeting')}
                </h1>
                <p className={styles.intro}>{t(`home.intro.${role}`)}</p>
            </header>

            {showChecklist && (
                <section className={styles.checklist} aria-labelledby="home-checklist-title">
                    <div className={styles.checklistHeader}>
                        <h2 className={styles.sectionTitle} id="home-checklist-title">
                            {t('home.checklist.title')}
                        </h2>
                        <span className={styles.progress}>
                            {t('home.checklist.progress', { done: doneCount, total: steps.length })}
                        </span>
                    </div>
                    <ol className={styles.steps}>
                        {steps.map((step) => (
                            <li key={step.id}>
                                <Link className={styles.step} to={step.to} data-state={step.state}>
                                    {step.state === 'done' && <CheckCircleIcon className={styles.stepIcon} />}
                                    {step.state === 'open' && <RadioButtonUncheckedIcon className={styles.stepIcon} />}
                                    {step.state === 'unknown' && <HelpOutlineIcon className={styles.stepIcon} />}
                                    <span className={styles.stepLabel}>{t(step.labelKey)}</span>
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

            <section aria-labelledby="home-areas-title">
                <h2 className={styles.sectionTitle} id="home-areas-title">
                    {t('home.areas.title')}
                </h2>
                <ul className={styles.tiles}>
                    {tiles.map((tile) => {
                        const lines = factsFor(tile, facts, t);

                        return (
                            <li key={tile.id} className={styles.tileItem}>
                                <div className={styles.tile}>
                                    <Link className={styles.tileLink} to={tile.to}>
                                        <span className={styles.tileIcon} aria-hidden>
                                            <NavGlyph name={tile.glyph} />
                                        </span>
                                        <h3 className={styles.tileTitle}>{t(tile.titleKey)}</h3>
                                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                                    </Link>
                                    <p className={styles.tileText}>{t(tile.textKey)}</p>
                                    {lines.length > 0 && (
                                        <ul className={styles.facts}>
                                            {lines.map((line) => (
                                                <li key={line}>{line}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {tile.id === 'settings' && settingsGroups.length > 0 && (
                                        <dl className={styles.settingsGroups}>
                                            {settingsGroups.map((group) => (
                                                <div key={group.id} className={styles.settingsGroup}>
                                                    <dt>{t(group.titleKey)}</dt>
                                                    {group.items.map((item) => (
                                                        <dd key={item.to}>
                                                            <Link to={item.to}>{t(item.labelKey)}</Link>
                                                        </dd>
                                                    ))}
                                                </div>
                                            ))}
                                        </dl>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
};

export default HomePage;

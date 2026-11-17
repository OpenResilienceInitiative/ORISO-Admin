import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import routePathNames from '../../appConfig';
import type { ContactPersonTip } from './contactPersonTip';
import styles from './contactPersonTip.module.scss';

type Translate = (key: string, options?: object) => string;

/** "1 Beratungsstelle", not "1 Beratungsstellen": the singular has its own key. */
const countText = (t: Translate, key: string, count: number) => t(count === 1 ? `${key}.one` : key, { count });

/**
 * Home tip for centres without a contact person (ORISO-Admin#1534). BST admins see
 * their own centre, Träger admins a list with edit links, platform admins a count
 * per Träger. Renders nothing when every centre is covered.
 */
export const MissingContactPersonTip = ({ tip }: { tip: ContactPersonTip | null }) => {
    const { t } = useTranslation();
    if (!tip) return null;

    const count = tip.kind === 'platform' ? tip.total : tip.agencies.length;

    return (
        <section className={styles.tip} aria-labelledby="home-contact-person-tip" data-kind={tip.kind}>
            <div className={styles.header}>
                <span className={styles.icon} aria-hidden>
                    <SupportAgentOutlinedIcon />
                </span>
                <h2 className={styles.title} id="home-contact-person-tip">
                    {t('home.contactPersonTip.title')}
                </h2>
                <span className={styles.count}>{count}</span>
            </div>
            <p className={styles.text}>
                {tip.kind === 'agency' && tip.agencies.length === 1
                    ? t('home.contactPersonTip.text.agency.one', { centre: tip.agencies[0].agencyName })
                    : countText(t, `home.contactPersonTip.text.${tip.kind}`, count)}
            </p>
            {tip.kind !== 'platform' ? (
                <ul className={styles.list}>
                    {tip.agencies.map((agency) => (
                        <li key={agency.agencyId}>
                            <Link className={styles.row} to={agency.to}>
                                <span className={styles.rowLabel}>{agency.agencyName}</span>
                                <span className={styles.rowAction}>{t('home.contactPersonTip.set')}</span>
                                <ChevronRightIcon className={styles.chevron} aria-hidden />
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <>
                    <ul className={styles.list}>
                        {tip.tenants.map((tenant) => (
                            <li key={String(tenant.tenantId)} className={styles.row} data-static>
                                <span className={styles.rowLabel}>
                                    {tenant.tenantName || t('home.contactPersonTip.unknownTenant')}
                                </span>
                                <span className={styles.rowCount}>
                                    {countText(t, 'home.contactPersonTip.centres', tenant.count)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Link className={styles.more} to={routePathNames.agency}>
                        {t('home.contactPersonTip.openAgencies')}
                        <ChevronRightIcon className={styles.chevron} aria-hidden />
                    </Link>
                </>
            )}
            <p className={styles.note}>{t('home.contactPersonTip.note')}</p>
        </section>
    );
};

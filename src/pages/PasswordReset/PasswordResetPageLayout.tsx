import { Col, Row } from 'antd';
import clsx from 'clsx';
import { ThemeProvider } from '@mui/material/styles';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import Stage from '../Login/Stage';
import styles from './PasswordResetPageLayout.module.scss';

export interface PasswordResetPageLayoutProps {
    children: React.ReactNode;
    /**
     * `login` (default): short, vertically centred form in the sign-in column,
     * as on the login page.
     *
     * `longForm`: the page hosts a tall multi-step form (tenant-admin
     * onboarding, #569/#594). It gets the wider reading column a long legal
     * text needs (`publicLongForm`, see loginForm.less), is centred in the
     * viewport on desktop and top-aligned below xl so its first field stays
     * the first thing in view. Scrolling itself is provided by
     * PublicPageLayoutWrapper for every public page.
     *
     * `wizard` (#997): the widest public column — the counsellor onboarding
     * composes whole cards side by side (CardGrid), which neither the sign-in
     * column nor the longForm reading measure can host. Top-aligned on every
     * breakpoint: the first card stays the first thing in view.
     */
    variant?: 'login' | 'longForm' | 'wizard';
}

export const PasswordResetPageLayout = ({ children, variant = 'login' }: PasswordResetPageLayoutProps) => {
    const { data: tenantData } = usePublicTenantData();
    const isLongForm = variant === 'longForm';
    const isWizard = variant === 'wizard';

    return (
        // `publicLongForm` opts out of the 320px sign-in column cap that
        // loginForm.less applies to every public page from md up (#594.3): a
        // 60-page agreement needs a reading measure, a login form does not.
        <PublicPageLayoutWrapper
            className={clsx('login flex-col flex', (isLongForm || isWizard) && 'publicLongForm')}
            // The language switcher is the third entry of the stage footer menu
            // now (#594.15b). Taking it out of the light column is what frees
            // the space the form needs to centre with equal side spacing
            // (#594.16a) — it used to reserve a ~200px strip on the right.
            footerVariant="stage"
        >
            {/* The Admin panel's branding fade plays once on EVERY public page
                (#594.3). It is fixed-position and settles off-canvas below xl,
                so it never covers a long form after its intro. */}
            <Stage logo={tenantData?.theming?.logo} claim={tenantData?.content?.claim} />
            <Row align={isLongForm || isWizard ? 'top' : 'middle'} style={{ flex: '1 0 auto' }}>
                <Col
                    xs={{ span: 20, offset: 2 }}
                    md={isWizard ? { span: 20, offset: 2 } : { span: 8, offset: 2 }}
                    xl={isWizard ? { span: 16, offset: 4 } : { span: 6, offset: 5 }}
                    className={isLongForm ? styles.longFormColumn : undefined}
                >
                    <ThemeProvider theme={orisoMuiTheme}>{children}</ThemeProvider>
                </Col>
            </Row>
        </PublicPageLayoutWrapper>
    );
};

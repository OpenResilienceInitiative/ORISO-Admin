import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { ReactComponent as NewWindowIcon } from '../../../resources/img/svg/new-window.svg';
import styles from './styles.module.scss';

export const Documentation = () => {
    const { t } = useTranslation();

    return (
        <Card titleKey="profile.documentation.title" subTitleKey="profile.documentation.description">
            <Link to="/docs" target="_blank" className={styles.button}>
                <NewWindowIcon />
                {t('profile.documentation.button')}
            </Link>
        </Card>
    );
};

import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Check from '@mui/icons-material/Check';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { keywordCoverage, type BlockProfile } from './journey';
import styles from './styles.module.scss';

interface SearchPillProps {
    profile?: BlockProfile;
    /** Opens the search terms of the block. */
    onOpen?: () => void;
}

/** Whether the block is findable: ✓ once every language has enough search terms, else "2/7". */
export const SearchPill = ({ profile, onOpen }: SearchPillProps) => {
    const { t } = useTranslation();
    const { covered, total, complete } = keywordCoverage(profile);
    const label = t(complete ? 'journeys.keywords.covered' : 'journeys.keywords.partly', {
        covered: covered.length,
        total,
    });
    return (
        <button
            type="button"
            className={classNames(styles.translation, styles.searchPill, { [styles.searchPillDone]: complete })}
            title={label}
            onClick={onOpen}
            disabled={!onOpen}
            data-testid="step-search"
        >
            <SearchOutlined aria-hidden />
            <span aria-hidden>{complete ? <Check /> : `${covered.length}/${total}`}</span>
            <span className={styles.srOnly}>{label}</span>
        </button>
    );
};

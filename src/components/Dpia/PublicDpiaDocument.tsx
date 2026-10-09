import { DpiaDocumentPage } from './DpiaDocumentPage';
import { DPIA_CHAPTERS } from './DpiaChapters';
import { usePublicDpiaMasterData } from '../../hooks/usePublicDpiaMasterData.hook';
import styles from './styles.module.scss';

/** Public composition seam. Routing/edit-save-readback acceptance belongs to #735. */
export const PublicDpiaDocument = () => {
    const query = usePublicDpiaMasterData();
    if (query.isPending)
        return (
            <p className={styles.documentState} role="status">
                DPIA-Stammdaten werden geladen …
            </p>
        );
    if (query.isError)
        return (
            <p className={styles.documentState} role="alert">
                DPIA-Stammdaten sind derzeit nicht verfügbar.
            </p>
        );
    const masterData = query.data;
    return (
        <DpiaDocumentPage
            masterData={masterData}
            chapters={DPIA_CHAPTERS}
            initialPreset={masterData?.supervisoryAuthority?.legalFramework === 'GDPR' ? 'dsgvo' : 'kdg'}
        />
    );
};

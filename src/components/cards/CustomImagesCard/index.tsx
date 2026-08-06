import classNames from 'classnames';
import { Card } from '../../Card';
import { ImageUploadField } from '../../ImageUploadField';
import { M3Button } from '../../M3Button';
import { ReactComponent as PencilIcon } from '../../../resources/img/svg/pencil.svg';
import styles from './styles.module.scss';

// Placeholder header glyph until the exact Figma image icon is exported.
const ImageIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="40" height="40">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
        <path d="M5 17l4.5-4.5 3 3L16 12l3 3" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
);

export interface CustomImagesCardProps {
    logoSrc?: string;
    faviconSrc?: string;
    onUploadLogo?: () => void;
    onUploadFavicon?: () => void;
    onEdit?: () => void;
    className?: string;
}

/**
 * "Custom images" settings card (Figma Admin.ORISO 1-34189). Two ImageUploadField
 * instances (logo + favicon) inside the shared Card skeleton.
 */
export const CustomImagesCard = ({
    logoSrc,
    faviconSrc,
    onUploadLogo,
    onUploadFavicon,
    onEdit,
    className,
}: CustomImagesCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<ImageIcon />}
        titleKey="Custom images"
        subTitle="Please note we can only accept JPG/PNG formats up to 500 KB."
        footer={
            <M3Button variant="text" icon={<PencilIcon />} onClick={onEdit}>
                Edit
            </M3Button>
        }
    >
        <div className={styles.body}>
            <ImageUploadField title="Logo · 512×512px" previewSrc={logoSrc} onUpload={onUploadLogo} />
            <ImageUploadField
                shape="circle"
                title="Favicon · 32×32px"
                previewSrc={faviconSrc}
                onUpload={onUploadFavicon}
            />
        </div>
    </Card>
);

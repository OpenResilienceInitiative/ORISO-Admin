import { useMemo } from 'react';
import { renderReadme } from '../../addons/renderReadme';
import { useAddonReadme } from './useAddons';
import styles from './addons.module.scss';

interface AddonReadmeProps {
    name: string;
    hasReadme?: boolean;
}

/** The add-on's full readme. Nothing when there is none. */
export const AddonReadme = ({ name, hasReadme }: AddonReadmeProps) => {
    const readme = useAddonReadme(name, !!hasReadme);
    const html = useMemo(() => (readme.data ? renderReadme(readme.data) : ''), [readme.data]);

    if (!hasReadme || !html) {
        return null;
    }

    return (
        <div
            className={styles.readmeContent}
            // eslint-disable-next-line react/no-danger -- rendered without raw HTML and sanitised in renderReadme
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default AddonReadme;

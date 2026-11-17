import { Button } from 'antd';
import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { renderReadme } from '../../addons/renderReadme';
import { useAddonReadme } from './useAddons';
import styles from './addons.module.scss';

interface AddonReadmeProps {
    name: string;
    hasReadme?: boolean;
}

/** The add-on's readme, collapsed to a preview when it is long. Nothing when there is none. */
export const AddonReadme = ({ name, hasReadme }: AddonReadmeProps) => {
    const { t } = useTranslation();
    const readme = useAddonReadme(name, !!hasReadme);
    const html = useMemo(() => (readme.data ? renderReadme(readme.data) : ''), [readme.data]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const contentId = `addon-${name}-readme`;

    useEffect(() => {
        const element = contentRef.current;
        if (!element) {
            return undefined;
        }
        const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        Array.from(element.children).forEach((child) => observer.observe(child));
        element.addEventListener('load', measure, true);
        return () => {
            observer.disconnect();
            element.removeEventListener('load', measure, true);
        };
    }, [html]);

    if (!hasReadme || !html) {
        return null;
    }

    return (
        <div className={styles.readme}>
            <div
                ref={contentRef}
                id={contentId}
                className={classNames(styles.readmeContent, { [styles.readmeCollapsed]: !expanded })}
                // eslint-disable-next-line react/no-danger -- rendered without raw HTML and sanitised in renderReadme
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {(overflows || expanded) && (
                <Button
                    type="link"
                    className={styles.inlineLink}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => setExpanded((current) => !current)}
                >
                    {t(expanded ? 'addons.readme.less' : 'addons.readme.more')}
                </Button>
            )}
        </div>
    );
};

export default AddonReadme;

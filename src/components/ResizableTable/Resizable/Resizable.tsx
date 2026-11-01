import { Resizable } from 'react-resizable';
import { useTranslation } from 'react-i18next';

const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;
    const { t } = useTranslation();

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                /* A focusable ARIA window separator is a keyboard-operated splitter. */
                /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
                <span
                    role="separator"
                    aria-label={t('table.resizeColumn', 'Spaltenbreite ändern')}
                    aria-orientation="vertical"
                    aria-valuemin={50}
                    aria-valuemax={500}
                    aria-valuenow={width}
                    tabIndex={0}
                    className="react-resizable-handle"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        const nextWidth = {
                            ArrowLeft: width - 10,
                            ArrowRight: width + 10,
                            Home: 50,
                            End: 500,
                        }[e.key];
                        if (nextWidth === undefined || !onResize) return;
                        e.preventDefault();
                        onResize(e, {
                            node: e.currentTarget.parentElement,
                            size: { width: Math.max(50, Math.min(500, nextWidth)), height: 0 },
                            handle: 'e',
                        });
                    }}
                />
                /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
            }
            onResize={onResize}
            draggableOpts={{
                enableUserSelectHack: false,
            }}
            maxConstraints={[500, 500]}
            minConstraints={[50, 50]}
        >
            <th {...restProps} />
        </Resizable>
    );
};

export default ResizableTitle;

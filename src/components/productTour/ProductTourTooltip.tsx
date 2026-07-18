import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TooltipRenderProps } from 'react-joyride';
import { Button, BUTTON_TYPES } from '../button/Button';

/**
 * Admin/M3-styled Joyride tooltip. Step titles and contents arrive as i18n
 * keys (set by mapStepsToJoyride) and are translated here; step copy may
 * contain static markup like <br /> from the translation bundles.
 */
export const ProductTourTooltip = ({
    index,
    size,
    isLastStep,
    step,
    controls,
    tooltipProps,
}: TooltipRenderProps) => {
    const { t } = useTranslation();

    const nextLabel = isLastStep ? t('productTour.done') : t('productTour.next');

    return (
        <div
            className="productTourTooltip"
            role="alertdialog"
            aria-label={t(String(step.title))}
            {...tooltipProps}
        >
            <div className="productTourTooltip__header">
                <h2 className="productTourTooltip__title">
                    {t(String(step.title))}
                </h2>
                <button
                    type="button"
                    className="productTourTooltip__close"
                    onClick={() => controls.skip('button_close')}
                    aria-label={t('productTour.close')}
                >
                    <CloseOutlined aria-hidden="true" />
                </button>
            </div>
            <div
                className="productTourTooltip__content"
                dangerouslySetInnerHTML={{
                    __html: t(String(step.content)),
                }}
            />
            <div className="productTourTooltip__actions">
                {index > 0 && (
                    <Button
                        item={{
                            label: t('productTour.back'),
                            type: BUTTON_TYPES.SECONDARY,
                        }}
                        buttonHandle={() => controls.prev()}
                        className="productTourTooltip__back"
                    />
                )}
                <Button
                    item={{
                        label: nextLabel,
                        type: BUTTON_TYPES.PRIMARY,
                    }}
                    buttonHandle={() => controls.next()}
                    className="productTourTooltip__next"
                />
            </div>
            <div className="productTourTooltip__footer">
                <span className="productTourTooltip__progress" aria-live="polite">
                    {`${t('productTour.step')} ${index + 1} ${t('productTour.of')} ${size}`}
                </span>
                <div className="productTourTooltip__bullets" aria-hidden="true">
                    {Array.from({ length: size }, (_, bulletIndex) => (
                        <span
                            key={bulletIndex}
                            className={
                                bulletIndex === index
                                    ? 'productTourTooltip__bullet productTourTooltip__bullet--active'
                                    : 'productTourTooltip__bullet'
                            }
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

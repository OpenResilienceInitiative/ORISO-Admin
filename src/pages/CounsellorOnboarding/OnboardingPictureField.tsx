import { useEffect, useState } from 'react';
import { ConsultantPictureField } from '../../components/ConsultantPictureField';
import type { CounsellorWizardData } from './useCounsellorOnboardingFlow';

export interface OnboardingPictureFieldProps {
    value: CounsellorWizardData['picture'];
    disabled?: boolean;
    onChange: (patch: Partial<CounsellorWizardData['picture']>) => void;
}

/**
 * The wizard's photo step. The file stays in the browser until registration: the consultant
 * does not exist yet, so it is stored right after the account (invite-token route). It starts
 * internal only; the counsellor may switch it to visible for advice seekers.
 */
export const OnboardingPictureField = ({ value, disabled = false, onChange }: OnboardingPictureFieldProps) => {
    const [previewSrc, setPreviewSrc] = useState<string>();
    useEffect(() => {
        if (!value.file) {
            setPreviewSrc(undefined);
            return undefined;
        }
        const url = URL.createObjectURL(value.file);
        setPreviewSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [value.file]);

    return (
        <ConsultantPictureField
            previewSrc={previewSrc}
            disabled={disabled}
            hasPendingFile={!!value.file}
            onFileChosen={(file) => onChange({ file })}
            onDiscard={() => onChange({ file: null, publicToAdviceSeekers: false })}
            visibility={
                value.file
                    ? {
                          internalOnly: !value.publicToAdviceSeekers,
                          onChange: (internalOnly) => onChange({ publicToAdviceSeekers: !internalOnly }),
                      }
                    : undefined
            }
        />
    );
};

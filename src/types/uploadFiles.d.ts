export interface UploadFileProps {
    size: number;
    type: string;
    name?: string;
}

export interface UploadValidationPolicy {
    accept: string;
    mimeTypes: readonly string[];
    invalidMessageKey: string;
    validate: (dataUrl: string, file: UploadFileProps) => boolean;
    canPreview: (value: string) => boolean;
}

const getBase64 = (img: Record<string, any>, callback: (result: string) => void, onError?: () => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result?.toString()));
    reader.addEventListener('error', () => onError?.());
    reader.addEventListener('abort', () => onError?.());
    reader.readAsDataURL(img as Blob);
};

export default getBase64;

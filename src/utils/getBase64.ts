const getBase64 = (img: Record<string, any>, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result?.toString()));
    reader.readAsDataURL(img as Blob);
};

export default getBase64;

const DATA_URL_MEDIA_TYPE = /^data:([^;,]*)/i;
const IMAGE_MEDIA_TYPE = /^image\//i;

/**
 * The media type a browser reports for a picked `.ico` file varies: Chrome says
 * `image/vnd.microsoft.icon`, Firefox `image/x-icon`, and a host with no mapping
 * for the extension reports an empty string. `FormFileUploaderField` accepts the
 * third case on the file extension (see `isAcceptedFile`), but `FileReader`
 * labels a type-less blob `application/octet-stream`, so the stored value is
 *
 *   data:application/octet-stream;base64,AAABAAEA…
 *
 * which is not an image data URL. `getSafeFaviconUrl` refuses it — correctly,
 * it must not admit arbitrary media types — so the upload appeared to work while
 * the browser tab kept the built-in favicon, and the card's own preview `<img>`
 * stayed blank.
 *
 * Relabelling at the upload seam keeps the stored value honest for every later
 * consumer instead of loosening the gatekeeper. Only a file that is an `.ico`
 * by name and carries no image media type is touched.
 */
export const normalizeIconDataUrl = (dataUrl?: string, fileName?: string): string | undefined => {
    if (!dataUrl || !/\.ico$/i.test(fileName ?? '')) {
        return dataUrl;
    }

    const mediaType = DATA_URL_MEDIA_TYPE.exec(dataUrl)?.[1];
    if (mediaType === undefined || IMAGE_MEDIA_TYPE.test(mediaType)) {
        return dataUrl;
    }

    return dataUrl.replace(DATA_URL_MEDIA_TYPE, 'data:image/x-icon');
};

export default normalizeIconDataUrl;

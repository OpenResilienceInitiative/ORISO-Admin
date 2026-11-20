import { UploadValidationPolicy } from '../types/uploadFiles';

const isPassiveSvg = (result: string): boolean => {
    try {
        const source = new TextDecoder().decode(
            Uint8Array.from(atob(result.split(',')[1]), (character) => character.charCodeAt(0)),
        );
        const document = new DOMParser().parseFromString(source, 'image/svg+xml');
        const allowed = new Set([
            'svg',
            'g',
            'path',
            'rect',
            'circle',
            'ellipse',
            'line',
            'polyline',
            'polygon',
            'title',
            'desc',
        ]);
        const attributes = new Set([
            'xmlns',
            'viewBox',
            'width',
            'height',
            'x',
            'y',
            'x1',
            'x2',
            'y1',
            'y2',
            'cx',
            'cy',
            'r',
            'rx',
            'ry',
            'd',
            'points',
            'fill',
            'fill-rule',
            'clip-rule',
            'stroke',
            'stroke-width',
            'stroke-linecap',
            'stroke-linejoin',
            'opacity',
            'fill-opacity',
            'stroke-opacity',
            'transform',
            'version',
            'id',
        ]);
        return (
            !/<!DOCTYPE|<!ENTITY/i.test(source) &&
            document.documentElement.namespaceURI === 'http://www.w3.org/2000/svg' &&
            document.documentElement.tagName === 'svg' &&
            Array.from(document.querySelectorAll('*')).every(
                (element) =>
                    element.namespaceURI === 'http://www.w3.org/2000/svg' &&
                    allowed.has(element.tagName) &&
                    Array.from(element.attributes).every(
                        (attribute) => attributes.has(attribute.name) && !/url\(|javascript:/i.test(attribute.value),
                    ),
            )
        );
    } catch {
        return false;
    }
};

export const assistantIconUploadPolicy: UploadValidationPolicy = {
    accept: '.svg,.png,image/svg+xml,image/png',
    mimeTypes: ['image/png', 'image/svg+xml'],
    invalidMessageKey: 'settings.assistant.invalid',
    validate: (result, file) => file.type !== 'image/svg+xml' || isPassiveSvg(result),
    canPreview: (value) => /^data:image\/(?:png|svg\+xml);base64,/i.test(value),
};

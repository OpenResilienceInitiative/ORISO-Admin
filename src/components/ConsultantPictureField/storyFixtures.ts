/** A synthetic 48×48 PNG portrait silhouette for stories (no real person). */
export const PORTRAIT_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAmElEQVR42u3Wuw2AMAxF0VczHSOwHJshMQALoCA6iPOTnTh60i1dnMo2rvMYKhBEEEEEETQzaN/WWB1AgqbFBA1KC8s/qEhTYYK2ptREEEEEEeQLNNym5nF1+g8FDZaQAHoGLEAvpSQtUAWlggUbTb4JNpR8Fow1SRPsNbLJD0hVI5jQSxMzeQCZaX5Nw4OMNV8TQQRNB7oBVMs6KI+fzQMAAAAASUVORK5CYII=';

export const PORTRAIT_PNG_DATA_URL = `data:image/png;base64,${PORTRAIT_PNG_BASE64}`;

const bytes = () => Uint8Array.from(atob(PORTRAIT_PNG_BASE64), (c) => c.charCodeAt(0));

export const portraitBlob = () => new Blob([bytes()], { type: 'image/png' });

export const portraitFile = (name = 'portrait.png') => new File([bytes()], name, { type: 'image/png' });

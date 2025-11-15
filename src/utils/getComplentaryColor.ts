function padZero(str: string) {
    const zeros = new Array(2).join('0');
    return (zeros + str).slice(-2);
}

function getComplentaryColor(color: string) {
    let hex = '';

    if (color.indexOf('#') === 0) {
        hex = color.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    // invert color components
    const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16);
    const g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16);
    const b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);

    // pad each with zeros and return
    // eslint-disable-next-line consistent-return
    return `#${padZero(r)}${padZero(g)}${padZero(b)}`;
}

export default getComplentaryColor;

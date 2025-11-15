const PASSWORD_MIN_LENGTH = 8;

const hasNumber = (value: string) => {
    return /[0-9]/.test(value);
};

const hasMixedLetters = (value: string) => {
    return /[a-zäöü]/.test(value) && /[A-ZÄÖÜ]/.test(value);
};

const hasSpecialChar = (value: string) => {
    return /[^\p{Lu}\p{Lt}\p{Ll}\p{Lm}\p{Lo}\p{Nd}]/gu.test(value);
};

export const validatePasswordCriteria = (value: string) => {
    const passwordValidationParams = {
        hasUpperLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        hasMinLength: false,
    };

    if (hasMixedLetters(value)) passwordValidationParams.hasUpperLowerCase = true;
    if (hasNumber(value)) passwordValidationParams.hasNumber = true;
    if (hasSpecialChar(value)) passwordValidationParams.hasSpecialChar = true;
    if (value.length > PASSWORD_MIN_LENGTH) passwordValidationParams.hasMinLength = true;

    return Object.values(passwordValidationParams).filter((v) => !v).length === 0;
};

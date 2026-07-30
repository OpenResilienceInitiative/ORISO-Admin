import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared M3 shell for the MUI form controls that are not plain text inputs
 * (select, colour, slider, radio). It reproduces the outline, label, focus,
 * error and disabled treatment of `MuiFormField` against the same admin CSS
 * variables, so a select renders identically to a text field in the same form.
 *
 * `MuiFormField` still carries its own copy of these rules. Deduplicating the
 * two is deliberately left for a follow-up: PR #606 is rewriting that literal
 * right now, and folding it into this module would guarantee a conflict.
 */
export const muiFieldSx = (isDisabled?: boolean): SxProps<Theme> => ({
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--m3-body-font-family)',
    ...(isDisabled
        ? {
              opacity: 0.5,
              cursor: 'not-allowed',
              pointerEvents: 'auto',
              '&:hover': { cursor: 'not-allowed' },
          }
        : null),
    '& .MuiInputBase-root': {
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        // Outlined controls sit on the surface behind them (matches #606).
        backgroundColor: 'transparent',
        color: 'var(--admin-form-field-text)',
        fontFamily: 'var(--m3-body-font-family)',
        fontSize: 16,
        lineHeight: '24px',
        letterSpacing: '0.5px',
    },
    '& .MuiInputLabel-root': {
        maxWidth: 'calc(100% - 24px)',
        color: 'var(--label-color)',
        fontFamily: 'var(--m3-body-font-family)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--input-focus-label-color, var(--admin-form-field-text))',
    },
    '& .MuiInputLabel-root.Mui-error': {
        color: 'var(--form-error, #cc0000)',
    },
    '& .MuiInputLabel-root.Mui-disabled': {
        color: 'var(--label-color)',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--input-border-color)',
    },
    '& .MuiOutlinedInput-notchedOutline legend': {
        width: 'fit-content',
        marginBottom: 0,
        borderBottom: 'none',
        fontSize: '0.75em',
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--input-hover-border-color, var(--admin-form-field-text, #1b1b1b))',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--input-focus-border-color, var(--admin-form-field-text, #1b1b1b))',
        borderWidth: 2,
    },
    '& .MuiOutlinedInput-root.Mui-focused': {
        outline: 'none',
    },
    '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--form-error, #cc0000)',
    },
    '& .MuiOutlinedInput-root.Mui-error:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--form-error, #cc0000)',
    },
    '& .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--form-error, #cc0000)',
        borderWidth: 2,
    },
    '& .MuiInputBase-root.Mui-disabled': {
        color: 'var(--admin-form-field-text)',
        cursor: 'not-allowed',
        WebkitTextFillColor: 'var(--admin-form-field-text)',
    },
    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--input-border-color)',
    },
    '& .MuiFormHelperText-root': {
        marginInline: '16px',
        color: 'var(--admin-form-muted-text)',
        fontFamily: 'var(--m3-body-font-family)',
        overflowWrap: 'anywhere',
    },
    '& .MuiFormHelperText-root.Mui-error': {
        color: 'var(--form-error, #cc0000)',
    },
});

export default muiFieldSx;

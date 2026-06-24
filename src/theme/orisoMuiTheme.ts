import { createTheme } from '@mui/material/styles';

/**
 * Scoped Material UI v5 theme for the ORISO admin panel.
 *
 * Intentionally minimal: it only aligns MUI primitives with the existing
 * admin-panel design tokens so the new outlined fields visually match the
 * surrounding antd UI. Wrap only the subtree that renders MUI controls in a
 * `<ThemeProvider theme={orisoMuiTheme}>` — do not apply globally.
 */
export const orisoMuiTheme = createTheme({
    shape: {
        borderRadius: 4,
    },
    palette: {
        primary: {
            // --primary navy used by existing admin buttons/links
            main: '#273270',
        },
    },
    typography: {
        fontFamily: 'Inter Variable, Inter, Arial, sans-serif',
    },
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                notchedOutline: {
                    // --m3-outline
                    borderColor: '#747878',
                },
            },
        },
    },
});

export default orisoMuiTheme;

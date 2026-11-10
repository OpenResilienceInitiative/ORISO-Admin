import { createContext } from 'react';
import type { NotifyProps } from '../Notify';

/**
 * Where "Ansehen" takes the person for a notice raised from inside an editor: the editor's own
 * heading, a visible target, instead of the empty wrapper the pop-up marker happens to sit in.
 * The editor provides it around its notices; `EditorHintSnackbar` uses it when a call site passes
 * no `jump` of its own.
 */
export const EditorJumpContext = createContext<NotifyProps['jump']>(undefined);

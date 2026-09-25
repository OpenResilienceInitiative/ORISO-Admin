import styles from './personCell.module.scss';

export interface PersonCellProps {
    name: string;
    email: string;
}

/** Name in bold, e-mail muted below. Without a name the e-mail takes the first line. */
export const PersonCell = ({ name, email }: PersonCellProps) => (
    <div className={styles.person}>
        <span className={styles.name}>{name || email}</span>
        {name && <span className={styles.email}>{email}</span>}
    </div>
);

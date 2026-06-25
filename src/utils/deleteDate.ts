type DeletableRecord = {
    deleteDate?: string | null;
};

export const isActiveDeleteDate = (deleteDate?: string | null) =>
    deleteDate === undefined || deleteDate === null || deleteDate === 'null';

export const isActiveRecord = ({ deleteDate }: DeletableRecord) => isActiveDeleteDate(deleteDate);

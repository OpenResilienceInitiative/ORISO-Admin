import { CounselorData } from '../../types/counselor';

/**
 * retrieve all needed counselor data
 * @param counselorData
 * @param counselors
 * @return data
 */
const deleteCounselorData = (counselorData: CounselorData, counselors: CounselorData[]) => {
    const counselorResponse = [...counselors];

    const removeIndex = counselorResponse.map((item) => item.id).indexOf(counselorData.id);

    if (removeIndex >= 0) {
        counselorResponse.splice(removeIndex, 1);
    }

    // eslint-disable-next-line no-console
    console.log('FAKE delete CounselorDta', counselorResponse);

    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(counselorResponse);
        }, 1000);
    });
};

export default deleteCounselorData;

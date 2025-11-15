import { CounselorData } from '../../types/counselor';

/**
 * retrieve all needed counselor data
 * @param counselorData
 * @param counselors

 * @return data
 */
const editCounselorData = (counselorData: CounselorData, counselors: CounselorData[]) => {
    const counselorResponse = counselors;
    const removeIndex = counselors.map((item) => item.id).indexOf(counselorData.id);
    if (removeIndex >= -1) {
        counselorResponse.splice(removeIndex, 1, counselorData);
    }

    // eslint-disable-next-line no-console
    console.log('FAKE edit CounselorDta', counselorResponse);

    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(counselorResponse);
        }, 1000);
    });
};

export default editCounselorData;

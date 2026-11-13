// import axios
import axios from "axios";

export const commonApi = async (httpRequest, url, reqBody, reqHeader, onUploadProgress) => {
    const reqConfig = {
        method: httpRequest,
        url,
        headers: reqHeader || {},
        onUploadProgress
    };

    // Only set body data for non-GET methods when body is actually provided
    if (
        httpRequest &&
        httpRequest.toUpperCase() !== "GET" &&
        reqBody !== undefined &&
        reqBody !== null &&
        reqBody !== ""
    ) {
        reqConfig.data = reqBody;
    }

    return await axios(reqConfig)
        .then((res) => {
            return res;
        })
        .catch((err) => {
            return err;
        });
};

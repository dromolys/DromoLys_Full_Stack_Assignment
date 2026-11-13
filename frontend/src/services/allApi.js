import { commonApi } from "./commonApi";
import { serverURL } from "./serverURL";

// Register API
export const registerAPI = async (reqBody) => {
    return await commonApi("POST", `${serverURL}/register`, reqBody);
};

// Login API
export const loginAPI = async (reqBody) => {
    return await commonApi("POST", `${serverURL}/login`, reqBody);
};

// Upload Dataset API
export const uploadDatasetAPI = async (reqBody, reqHeader, onUploadProgress) => {
    return await commonApi("POST", `${serverURL}/upload-dataset`, reqBody, reqHeader, onUploadProgress);
};

// Get User Datasets API (supports both /user-datasets and /datasets)
export const getUserDatasetsAPI = async (reqHeader) => {
    return await commonApi("GET", `${serverURL}/user-datasets`, null, reqHeader);
};

export const getDatasetsAPI = async (reqHeader) => {
    return await commonApi("GET", `${serverURL}/datasets`, null, reqHeader);
};

// Get Single Dataset by ID API
export const getDatasetByIdAPI = async (id, reqHeader) => {
    return await commonApi("GET", `${serverURL}/dataset/${id}`, null, reqHeader);
};

// Get Dataset Records API
export const getDatasetRecordsAPI = async (id, params = {}, reqHeader) => {
    const searchParams = new URLSearchParams(params).toString();
    const url = `${serverURL}/dataset/${id}/records${searchParams ? `?${searchParams}` : ""}`;
    return await commonApi("GET", url, null, reqHeader);
};

// Get All Dataset Records without limits
export const getAllDatasetRecordsAPI = async (id, reqHeader) => {
    return await commonApi("GET", `${serverURL}/dataset/${id}/records?limit=all`, null, reqHeader);
};

// Delete Dataset API
export const deleteDatasetAPI = async (id, reqHeader) => {
    return await commonApi("DELETE", `${serverURL}/dataset/${id}`, null, reqHeader);
};

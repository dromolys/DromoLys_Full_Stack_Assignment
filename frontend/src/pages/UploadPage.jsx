import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaCloudUploadAlt,
    FaFileCsv,
    FaCheckCircle,
    FaExclamationTriangle,
    FaArrowLeft,
    FaTimes,
    FaTable,
    FaSpinner,
    FaDownload,
    FaInfoCircle,
    FaEye
} from "react-icons/fa";
import Navbar from "../components/Navbar";
import { uploadDatasetAPI, getDatasetRecordsAPI } from "../services/allApi";

export default function UploadPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState([]);
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [totalPreviewLines, setTotalPreviewLines] = useState(0);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState("");

    const [validationErrors, setValidationErrors] = useState([]);
    const [generalError, setGeneralError] = useState("");
    const [successData, setSuccessData] = useState(null);
    const [uploadedRecordsPreview, setUploadedRecordsPreview] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);

    // Client-side preview of selected CSV
    const parsePreview = (csvText) => {
        const clean = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const lines = clean.split("\n").filter((l) => l.trim() !== "");
        setTotalPreviewLines(lines.length > 0 ? lines.length - 1 : 0);

        if (lines.length === 0) {
            setPreviewHeaders([]);
            setFilePreview([]);
            return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setPreviewHeaders(headers);

        const previewRows = lines.slice(1, 6).map((line) => {
            return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        });
        setFilePreview(previewRows);
    };

    const handleFileSelect = (selectedFile) => {
        setGeneralError("");
        setValidationErrors([]);
        setSuccessData(null);
        setUploadedRecordsPreview([]);

        if (!selectedFile) return;

        const isCsv =
            selectedFile.name.toLowerCase().endsWith(".csv") ||
            selectedFile.type === "text/csv" ||
            selectedFile.type === "application/vnd.ms-excel";

        if (!isCsv) {
            setGeneralError("Only CSV files (.csv) are allowed. Please select a valid CSV file.");
            setFile(null);
            setFilePreview([]);
            return;
        }

        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            parsePreview(content);
        };
        reader.readAsText(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const resetSelection = () => {
        setFile(null);
        setFilePreview([]);
        setPreviewHeaders([]);
        setTotalPreviewLines(0);
        setValidationErrors([]);
        setGeneralError("");
        setSuccessData(null);
        setUploadedRecordsPreview([]);
        setUploadProgress(0);
        setProcessingStatus("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setGeneralError("Please select a CSV file first.");
            return;
        }

        const token = sessionStorage.getItem("token");

        setUploading(true);
        setUploadProgress(10);
        setProcessingStatus("Uploading file to server...");
        setGeneralError("");
        setValidationErrors([]);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const reqHeader = token ? { Authorization: `Bearer ${token}` } : {};

            const result = await uploadDatasetAPI(formData, reqHeader, (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                    if (percent >= 100) {
                        setProcessingStatus("Validating CSV rows & inserting records...");
                    }
                }
            });

            if (result && result.status === 200) {
                setUploadProgress(100);
                setProcessingStatus("Completed");
                setSuccessData(result.data);

                // Fetch records immediately to display them
                const datasetId = result.data.dataset?._id;
                if (datasetId) {
                    try {
                        const recResult = await getDatasetRecordsAPI(datasetId, { limit: 15 }, reqHeader);
                        if (recResult && recResult.status === 200) {
                            setUploadedRecordsPreview(recResult.data.records || []);
                        }
                    } catch (_) {}
                }
            } else if (result?.response?.status === 409 || result?.status === 409) {
                setProcessingStatus("Completed");
                const resData = result.response?.data || result.data;
                const existing = resData?.existingDataset;
                if (existing) {
                    setSuccessData({
                        dataset: existing,
                        totalRecords: existing.recordCount,
                        isDuplicate: true,
                        message: resData.message
                    });
                    try {
                        const recResult = await getDatasetRecordsAPI(existing._id, { limit: 15 }, reqHeader);
                        if (recResult && recResult.status === 200) {
                            setUploadedRecordsPreview(recResult.data.records || []);
                        }
                    } catch (_) {}
                } else {
                    setGeneralError(resData?.message || "Duplicate dataset detected.");
                }
            } else if (result?.response?.status === 400 || result?.status === 400) {
                setProcessingStatus("Failed");
                const errData = result.response?.data;
                if (errData && Array.isArray(errData.errors)) {
                    setValidationErrors(errData.errors);
                    setGeneralError(
                        errData.message ||
                            "CSV Validation failed. Entire import was rejected with zero records saved."
                    );
                } else {
                    setGeneralError(errData?.message || "Invalid CSV format or missing required headers.");
                }
            } else {
                setProcessingStatus("Failed");
                const msg =
                    result?.response?.data?.message ||
                    result?.response?.data ||
                    result?.message ||
                    "An unexpected error occurred during upload.";
                setGeneralError(typeof msg === "string" ? msg : JSON.stringify(msg));
            }
        } catch (err) {
            console.error("Upload error:", err);
            setProcessingStatus("Failed");
            setGeneralError("Network or server connection failed. Please check your backend.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
                {/* Back button & Breadcrumb */}
                <div className="mb-6 flex items-center justify-between">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs"
                    >
                        <FaArrowLeft />
                        Back to Dashboard
                    </Link>

                    <a
                        href="/sample_vehicle_data.csv"
                        download="sample_vehicle_data.csv"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                    >
                        <FaDownload className="text-xs" />
                        Download Sample CSV
                    </a>
                </div>

                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Upload Vehicle Observation CSV
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Upload and validate your vehicle observation data. All rows are validated atomically before saving.
                    </p>
                </div>

                {/* Column Specification Info Box */}
                <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
                    <FaInfoCircle className="text-blue-600 text-base shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-blue-950">Required CSV Format & Validation Rules:</p>
                        <p className="text-blue-800">
                            • Exact Headers: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">time, vehicle_class, x(px), y(px)</code>
                        </p>
                        <p className="text-blue-800">
                            • Allowed Vehicle Classes: <span className="font-medium">Car, Bus, Motorcycle, Truck, Auto Rickshaw, Bicycle</span>
                        </p>
                        <p className="text-blue-800">
                            • Timestamp format: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">HH:MM:SS</code> (e.g. 08:00:23)
                        </p>
                        <p className="text-blue-800">
                            • Coordinates: Non-negative numeric pixel values for <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">x(px)</code> and <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">y(px)</code>.
                        </p>
                    </div>
                </div>

                {/* Success Card */}
                {successData && (
                    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-emerald-900 shadow-sm animate-in fade-in">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                                <FaCheckCircle className="text-2xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-emerald-950">
                                    {successData.isDuplicate
                                        ? "Dataset Already Imported"
                                        : "Dataset Uploaded & Processed Successfully!"}
                                </h3>
                                <p className="mt-1 text-sm text-emerald-800">
                                    File <span className="font-semibold">"{successData.dataset?.fileName}"</span> is stored with all records available for exploration.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-emerald-900">
                                    <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200">
                                        Total Records: <span className="font-bold">{successData.totalRecords?.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200">
                                        Status: <span className="font-bold">Completed</span>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center gap-3">
                                    <Link
                                        to={`/explore/${successData.dataset?._id}`}
                                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                                    >
                                        <FaEye />
                                        Explore All Records
                                    </Link>
                                    <Link
                                        to="/dashboard"
                                        className="px-4 py-2 bg-white hover:bg-emerald-100/50 text-emerald-900 text-xs font-semibold rounded-xl border border-emerald-300 transition-colors"
                                    >
                                        Go to Dashboard
                                    </Link>
                                    <button
                                        onClick={resetSelection}
                                        className="px-4 py-2 text-xs font-semibold text-emerald-800 hover:underline"
                                    >
                                        Upload Another File
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Immediate Preview of Imported Records */}
                        {uploadedRecordsPreview.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-emerald-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                                        Imported Records Preview
                                    </span>
                                    <Link
                                        to={`/explore/${successData.dataset?._id}`}
                                        className="text-xs font-bold text-emerald-700 hover:underline"
                                    >
                                        View all {successData.totalRecords?.toLocaleString()} records →
                                    </Link>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white shadow-xs max-h-60 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-emerald-100 text-left text-xs">
                                        <thead className="bg-emerald-50 text-emerald-800 font-bold sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2">#</th>
                                                <th className="px-4 py-2">Time</th>
                                                <th className="px-4 py-2">Vehicle Class</th>
                                                <th className="px-4 py-2">x(px)</th>
                                                <th className="px-4 py-2">y(px)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {uploadedRecordsPreview.map((rec, i) => (
                                                <tr key={rec._id || i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 text-slate-400 font-mono">{rec.rowNumber || i + 1}</td>
                                                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{rec.time}</td>
                                                    <td className="px-4 py-2 text-slate-700 font-semibold">{rec.vehicle_class}</td>
                                                    <td className="px-4 py-2 font-mono text-slate-600">{rec.x} px</td>
                                                    <td className="px-4 py-2 font-mono text-slate-600">{rec.y} px</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Validation Errors Box (Row-by-row breakdown) */}
                {validationErrors.length > 0 && (
                    <div className="mb-8 rounded-2xl border border-rose-300 bg-rose-50/90 p-6 text-rose-950 shadow-sm animate-in fade-in">
                        <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-rose-600 text-xl shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-bold text-rose-950">
                                        Validation Failed ({validationErrors.length} errors found)
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-800">
                                        Import Rejected
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-rose-800">
                                    The entire import was rejected. In accordance with data integrity rules, no partial records were saved to your database. Please fix the errors in your CSV and try again.
                                </p>

                                <div className="mt-4 max-h-60 overflow-y-auto rounded-xl bg-white border border-rose-200 p-3 space-y-2 text-xs font-mono text-rose-900">
                                    {validationErrors.map((err, idx) => (
                                        <div
                                            key={idx}
                                            className="p-2 rounded bg-rose-50/60 border border-rose-100 flex items-start gap-2"
                                        >
                                            <span className="font-bold text-rose-700 shrink-0">#{idx + 1}</span>
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* General Error Banner */}
                {generalError && validationErrors.length === 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FaExclamationTriangle className="text-rose-600 text-lg shrink-0" />
                            <p className="text-xs sm:text-sm font-medium">{generalError}</p>
                        </div>
                        <button
                            onClick={() => setGeneralError("")}
                            className="text-rose-500 hover:text-rose-700 text-sm"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}

                {!successData && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                        {/* Drag and Drop Box */}
                        {!file ? (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                                    isDragOver
                                        ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                                        : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/50"
                                }`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                    accept=".csv,text/csv"
                                    className="hidden"
                                />

                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
                                    <FaCloudUploadAlt className="text-3xl" />
                                </div>

                                <h3 className="text-base font-bold text-slate-800">
                                    Click to select or drag and drop your CSV file here
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Strictly accepts only <span className="font-semibold text-slate-700">.csv</span> files.
                                </p>

                                <div className="mt-5">
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                                    >
                                        Browse CSV File
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Selected File Display & Preview */
                            <div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
                                            <FaFileCsv />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(file.size / 1024).toFixed(1)} KB • {totalPreviewLines.toLocaleString()} estimated records
                                            </p>
                                        </div>
                                    </div>

                                    {!uploading && (
                                        <button
                                            onClick={resetSelection}
                                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                                            title="Remove file"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>

                                {/* First Rows Preview Table */}
                                {filePreview.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                <FaTable className="text-blue-600" />
                                                Preview of First Rows (Before Upload)
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                Showing top {filePreview.length} rows
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-2.5">#</th>
                                                        {previewHeaders.map((hdr, i) => (
                                                            <th key={i} scope="col" className="px-4 py-2.5">
                                                                {hdr}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {filePreview.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="hover:bg-slate-50/60">
                                                            <td className="px-4 py-2 text-slate-400 font-mono">
                                                                {rowIdx + 2}
                                                            </td>
                                                            {row.map((val, cellIdx) => (
                                                                <td
                                                                    key={cellIdx}
                                                                    className="px-4 py-2 text-slate-800 font-medium"
                                                                >
                                                                    {val}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Upload Progress Bar & Processing Status */}
                                {uploading && (
                                    <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
                                        <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaSpinner className="animate-spin text-blue-600" />
                                                {processingStatus}
                                            </span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-blue-200/60 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={resetSelection}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={handleUpload}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {uploading ? (
                                            <>
                                                <FaSpinner className="animate-spin text-sm" />
                                                Processing Dataset...
                                            </>
                                        ) : (
                                            <>
                                                <FaCloudUploadAlt className="text-base" />
                                                Upload & Validate CSV
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

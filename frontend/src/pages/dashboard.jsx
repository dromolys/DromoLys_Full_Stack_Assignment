import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCloudUploadAlt,FaDatabase, FaCheckCircle, FaExclamationTriangle,  FaSpinner, FaTrashAlt,FaExternalLinkAlt,FaSearch, FaSyncAlt, FaFileCsv, FaCalendarAlt,FaClock, FaFilter, FaUndo, FaChartBar, FaCar, FaBus, FaMotorcycle, FaTruck,FaBicycle,FaChevronLeft,FaChevronRight,FaCrosshairs} from "react-icons/fa";
import { MdElectricRickshaw } from "react-icons/md";
import Navbar from "../components/Navbar";
import { getUserDatasetsAPI, deleteDatasetAPI, getDatasetRecordsAPI } from "../services/allApi";

const VEHICLE_ICONS = {
    Car: <FaCar />,
    Bus: <FaBus />,
    Motorcycle: <FaMotorcycle />,
    Truck: <FaTruck />,
    "Auto Rickshaw": <MdElectricRickshaw className="text-base" />,
    Bicycle: <FaBicycle />
};

const VEHICLE_CLASSES = ["All", "Car", "Bus", "Motorcycle", "Truck", "Auto Rickshaw", "Bicycle"];

function Dashboard() {
    const navigate = useNavigate();

    // Dataset List State
    const [datasets, setDatasets] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(true);
    const [datasetsError, setDatasetsError] = useState("");
    const [datasetSearch, setDatasetSearch] = useState("");
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, dataset: null });
    const [deleting, setDeleting] = useState(false);

    // Selected Active Dataset
    const [selectedDataset, setSelectedDataset] = useState(null);

    // Filters State
    const [selectedClass, setSelectedClass] = useState("All");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Backend-driven Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25); // 10, 25, 50, 100, "all"
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
    });

    // Coordinated Data State (Table, Stats, Histogram)
    const [records, setRecords] = useState([]);
    const [statistics, setStatistics] = useState({
        totalRecords: 0,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        avgX: 0,
        avgY: 0
    });
    const [histograms, setHistograms] = useState({
        timeHistogram: [],
        vehicleHistogram: []
    });
    const [histogramMode, setHistogramMode] = useState("time"); // "time" or "vehicle"
    const [loadingRecords, setLoadingRecords] = useState(false);

    const getAuthHeader = () => {
        const token = sessionStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // 1. Fetch Datasets
    const fetchDatasets = async () => {
        setLoadingDatasets(true);
        setDatasetsError("");
        try {
            const reqHeader = getAuthHeader();
            const result = await getUserDatasetsAPI(reqHeader);

            if (result && (result.status === 200 || Array.isArray(result.data))) {
                const list = result.data || [];
                setDatasets(list);

                // Auto-select dataset if none selected or if previously selected was removed
                if (list.length > 0) {
                    if (!selectedDataset || !list.some((d) => d._id === selectedDataset._id)) {
                        const defaultChoice = list.find((d) => d.status === "Completed") || list[0];
                        setSelectedDataset(defaultChoice);
                    }
                } else {
                    setSelectedDataset(null);
                    setRecords([]);
                }
            } else {
                setDatasetsError(result?.response?.data?.message || "Failed to fetch datasets.");
            }
        } catch (err) {
            console.error("Error fetching datasets:", err);
            setDatasetsError("Unable to connect to the backend server.");
        } finally {
            setLoadingDatasets(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    // 2. Fetch Records, Stats, and Histogram from Backend (Coordinated Query)
    const fetchCoordinatedData = useCallback(async () => {
        if (!selectedDataset) return;

        setLoadingRecords(true);
        try {
            const reqHeader = getAuthHeader();
            const params = {
                page,
                pageSize: pageSize === "all" ? "all" : pageSize,
                vehicle_class: selectedClass,
                startTime,
                endTime,
                search: searchQuery
            };

            const result = await getDatasetRecordsAPI(selectedDataset._id, params, reqHeader);

            if (result && (result.status === 200 || result.data)) {
                const data = result.data || {};
                setRecords(data.records || []);
                setPagination(
                    data.pagination || {
                        page: 1,
                        pageSize: 25,
                        totalRecords: (data.records || []).length,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPrevPage: false
                    }
                );
                setStatistics(
                    data.statistics || {
                        totalRecords: (data.records || []).length,
                        minX: 0,
                        maxX: 0,
                        minY: 0,
                        maxY: 0,
                        avgX: 0,
                        avgY: 0
                    }
                );
                setHistograms(
                    data.histograms || {
                        timeHistogram: [],
                        vehicleHistogram: []
                    }
                );
            }
        } catch (err) {
            console.error("Error fetching dataset data:", err);
        } finally {
            setLoadingRecords(false);
        }
    }, [selectedDataset, page, pageSize, selectedClass, startTime, endTime, searchQuery]);

    useEffect(() => {
        if (selectedDataset) {
            fetchCoordinatedData();
        }
    }, [fetchCoordinatedData]);

    // Filter Change Handlers
    const handleClassSelect = (cls) => {
        setSelectedClass(cls);
        setPage(1);
    };

    const handleTimeRangeApply = (start, end) => {
        setStartTime(start);
        setEndTime(end);
        setPage(1);
    };

    const handleResetFilters = () => {
        setSelectedClass("All");
        setStartTime("");
        setEndTime("");
        setSearchQuery("");
        setPage(1);
    };

    const handleDatasetSelect = (dataset) => {
        setSelectedDataset(dataset);
        setSelectedClass("All");
        setStartTime("");
        setEndTime("");
        setSearchQuery("");
        setPage(1);
    };

    const handlePageSizeChange = (e) => {
        const val = e.target.value;
        setPageSize(val === "all" ? "all" : parseInt(val, 10));
        setPage(1);
    };

    const handleNextPage = () => {
        if (pagination.hasNextPage) {
            setPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (pagination.hasPrevPage) {
            setPage((prev) => Math.max(1, prev - 1));
        }
    };

    // Dataset Deletion
    const confirmDelete = async () => {
        if (!deleteModal.dataset) return;

        setDeleting(true);
        try {
            const reqHeader = getAuthHeader();
            const result = await deleteDatasetAPI(deleteModal.dataset._id, reqHeader);

            if (result && (result.status === 200 || result.data?.success)) {
                const remaining = datasets.filter((d) => d._id !== deleteModal.dataset._id);
                setDatasets(remaining);
                if (selectedDataset?._id === deleteModal.dataset._id) {
                    setSelectedDataset(remaining[0] || null);
                }
                setDeleteModal({ isOpen: false, dataset: null });
            } else {
                alert(result?.response?.data?.message || "Failed to delete dataset.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("An error occurred while deleting the dataset.");
        } finally {
            setDeleting(false);
        }
    };

    // Filtered Dataset List for search box
    const filteredDatasetsList = datasets.filter((d) =>
        (d.fileName || "").toLowerCase().includes(datasetSearch.toLowerCase())
    );

    // Status Badge Component
    const renderStatusBadge = (status, errorMessage) => {
        switch (status) {
            case "Completed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FaCheckCircle className="text-emerald-500" />
                        Completed
                    </span>
                );
            case "Processing":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <FaSpinner className="animate-spin text-blue-600" />
                        Processing
                    </span>
                );
            case "Failed":
                return (
                    <span
                        title={errorMessage || "Processing failed"}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                    >
                        <FaExclamationTriangle className="text-rose-500" />
                        Failed
                    </span>
                );
            case "Uploaded":
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Uploaded
                    </span>
                );
        }
    };

    // Active Histogram Data
    const activeHistogramList =
        histogramMode === "time" ? histograms.timeHistogram : histograms.vehicleHistogram;
    const maxHistogramCount = Math.max(1, ...activeHistogramList.map((item) => item.count));

    const isFiltersActive =
        selectedClass !== "All" || startTime !== "" || endTime !== "" || searchQuery !== "";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Workspace Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                Analytics & Observation Workspace
                            </p>
                        </div>
                        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Vehicle Observation Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Inspect vehicle observations with backend pagination, real-time filters, coordinate bounds, and time histograms.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchDatasets}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
                            title="Refresh datasets"
                        >
                            <FaSyncAlt className={loadingDatasets ? "animate-spin" : ""} />
                        </button>
                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm shadow-blue-500/30 transition-all hover:scale-[1.02]"
                        >
                            <FaCloudUploadAlt className="text-lg" />
                            Upload File
                        </Link>
                    </div>
                </div>

                {/* Error Banner */}
                {datasetsError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                            <FaExclamationTriangle className="text-rose-500 shrink-0 text-lg" />
                            <span>{datasetsError}</span>
                        </div>
                        <button onClick={fetchDatasets} className="font-semibold underline text-rose-700">
                            Retry
                        </button>
                    </div>
                )}

                {/* SECTION 1: DATASETS MANAGEMENT TABLE */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Your Uploaded Datasets</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select a dataset row below to sync the observation table, statistics, histogram, and filters.
                            </p>
                        </div>

                        {datasets.length > 0 && (
                            <div className="relative w-full sm:w-64">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                <input
                                    type="text"
                                    value={datasetSearch}
                                    onChange={(e) => setDatasetSearch(e.target.value)}
                                    placeholder="Filter datasets by name..."
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        )}
                    </div>

                    {loadingDatasets ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                            <FaSpinner className="animate-spin text-2xl text-blue-600 mb-2" />
                            <p className="text-xs font-semibold text-slate-600">Loading datasets...</p>
                        </div>
                    ) : datasets.length === 0 ? (
                        <div className="py-16 text-center max-w-sm mx-auto">
                            <FaFileCsv className="text-4xl text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">No datasets uploaded yet</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">
                                Upload a CSV file containing vehicle observation coordinates to get started.
                            </p>
                            <Link
                                to="/upload"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                <FaCloudUploadAlt />
                                Upload CSV
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3.5">Selected</th>
                                        <th className="px-6 py-3.5">File Name</th>
                                        <th className="px-6 py-3.5">Upload Date & Time</th>
                                        <th className="px-6 py-3.5">Total Records</th>
                                        <th className="px-6 py-3.5">Dataset State</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredDatasetsList.map((d) => {
                                        const isSelected = selectedDataset?._id === d._id;
                                        return (
                                            <tr
                                                key={d._id}
                                                onClick={() => handleDatasetSelect(d)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected ? "bg-blue-50/60 font-medium" : "hover:bg-slate-50"
                                                }`}
                                            >
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span
                                                        className={`inline-block w-3.5 h-3.5 rounded-full border-2 transition-all ${
                                                            isSelected
                                                                ? "border-blue-600 bg-blue-600 shadow-xs"
                                                                : "border-slate-300 bg-white"
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <FaFileCsv className="text-blue-500 text-base shrink-0" />
                                                        <span className="font-semibold text-slate-900 truncate max-w-xs">
                                                            {d.fileName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                                    {new Date(d.uploadDate || d.createdAt).toLocaleString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-900">
                                                    {(d.recordCount || 0).toLocaleString()} rows
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    {renderStatusBadge(d.status, d.errorMessage)}
                                                </td>
                                                <td
                                                    className="px-6 py-3 text-right whitespace-nowrap"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            to={`/explore/${d._id}`}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Dedicated explore page"
                                                        >
                                                            <FaExternalLinkAlt />
                                                        </Link>
                                                        <button
                                                            onClick={() => setDeleteModal({ isOpen: true, dataset: d })}
                                                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete dataset"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* SECTION 2: ACTIVE DATASET CONTROLS & COORDINATED OBSERVATION WORKSPACE */}
                {selectedDataset && (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Active Dataset Title & State Banner */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm shadow-blue-500/20">
                                    <FaFileCsv />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-lg font-extrabold text-slate-900">
                                            {selectedDataset.fileName}
                                        </h2>
                                        {renderStatusBadge(selectedDataset.status, selectedDataset.errorMessage)}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                        <span>
                                            Uploaded:{" "}
                                            {new Date(
                                                selectedDataset.uploadDate || selectedDataset.createdAt
                                            ).toLocaleString()}
                                        </span>
                                        <span>•</span>
                                        <span>Total Dataset Records: {(selectedDataset.recordCount || 0).toLocaleString()}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    to={`/explore/${selectedDataset._id}`}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
                                >
                                    <FaExternalLinkAlt className="text-xs" />
                                    Explore View
                                </Link>
                            </div>
                        </div>

                        {/* Coordinated Filters: Vehicle Class + Time Range + Search */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                                    <FaFilter className="text-blue-600" />
                                    Active Query Filters
                                </div>
                                {isFiltersActive && (
                                    <button
                                        onClick={handleResetFilters}
                                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 transition-colors"
                                    >
                                        <FaUndo className="text-xs" />
                                        Reset All Filters
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* Vehicle Class Filter Buttons */}
                                <div className="md:col-span-6 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 block">Vehicle Class</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {VEHICLE_CLASSES.map((cls) => {
                                            const isSelected = selectedClass === cls;
                                            return (
                                                <button
                                                    key={cls}
                                                    type="button"
                                                    onClick={() => handleClassSelect(cls)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                    }`}
                                                >
                                                    {VEHICLE_ICONS[cls] && <span className="text-xs">{VEHICLE_ICONS[cls]}</span>}
                                                    {cls}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Time Range Filters */}
                                <div className="md:col-span-4 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                                        <FaClock className="text-slate-400" />
                                        Time Range (HH:MM:SS)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={startTime}
                                            onChange={(e) => {
                                                setStartTime(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="From (e.g. 08:00)"
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                                        />
                                        <span className="text-slate-400 text-xs font-bold">to</span>
                                        <input
                                            type="text"
                                            value={endTime}
                                            onChange={(e) => {
                                                setEndTime(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="To (e.g. 09:30)"
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Keyword / Timestamp Search */}
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 block">Search</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="Time or class..."
                                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Time Range Presets */}
                            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-slate-400 font-medium">Quick Time Windows:</span>
                                {[
                                    { label: "08:00 - 08:30", start: "08:00:00", end: "08:30:00" },
                                    { label: "08:30 - 09:00", start: "08:30:00", end: "09:00:00" },
                                    { label: "09:00 - 09:30", start: "09:00:00", end: "09:30:00" },
                                    { label: "09:30 - 10:00", start: "09:30:00", end: "10:00:00" }
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => handleTimeRangeApply(preset.start, preset.end)}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Coordinated Summary Statistics (Synchronized with filters) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Matching Observations
                                </span>
                                <p className="mt-2 text-2xl font-extrabold text-blue-600">
                                    {statistics.totalRecords.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {selectedClass !== "All" ? `${selectedClass} observations` : "All classes"}
                                    {startTime || endTime ? ` in selected time` : ""}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <FaCrosshairs className="text-indigo-500" />
                                    Avg X Coordinate
                                </span>
                                <p className="mt-2 text-2xl font-extrabold text-indigo-600">
                                    {statistics.avgX} px
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Span: {statistics.minX}px to {statistics.maxX}px
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <FaCrosshairs className="text-purple-500" />
                                    Avg Y Coordinate
                                </span>
                                <p className="mt-2 text-2xl font-extrabold text-purple-600">
                                    {statistics.avgY} px
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Span: {statistics.minY}px to {statistics.maxY}px
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Active Filter Ratio
                                </span>
                                <p className="mt-2 text-2xl font-extrabold text-slate-800">
                                    {selectedDataset.recordCount > 0
                                        ? `${((statistics.totalRecords / selectedDataset.recordCount) * 100).toFixed(
                                              1
                                          )}%`
                                        : "0%"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {statistics.totalRecords} of {selectedDataset.recordCount} total rows
                                </p>
                            </div>
                        </div>

                        {/* SECTION 3: INTERACTIVE HISTOGRAM (Synchronized with filters) */}
                        <section className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <FaChartBar className="text-blue-600" />
                                        <h3 className="text-base font-bold text-slate-900">
                                            {histogramMode === "time"
                                                ? "Observations Distribution Over Time"
                                                : "Observations by Vehicle Category"}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Synchronized with active vehicle class filter:{" "}
                                        <strong className="text-slate-700">{selectedClass}</strong>
                                    </p>
                                </div>

                                {/* Histogram Field Toggle */}
                                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setHistogramMode("time")}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            histogramMode === "time"
                                                ? "bg-white text-blue-700 shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Over Time
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHistogramMode("vehicle")}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            histogramMode === "vehicle"
                                                ? "bg-white text-blue-700 shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        By Vehicle Class
                                    </button>
                                </div>
                            </div>

                            {/* Histogram Graphic Render */}
                            {loadingRecords ? (
                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                    <FaSpinner className="animate-spin text-2xl text-blue-600 mb-2" />
                                    <p className="text-xs text-slate-500">Updating histogram...</p>
                                </div>
                            ) : activeHistogramList.length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-400">
                                    No observation data points match the current filter selection.
                                </div>
                            ) : (
                                <div className="pt-2">
                                    {/* Bar Grid */}
                                    <div className="h-44 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200">
                                        {activeHistogramList.map((item, idx) => {
                                            const heightPercent = Math.max(
                                                6,
                                                Math.round((item.count / maxHistogramCount) * 100)
                                            );
                                            const percentOfFiltered =
                                                statistics.totalRecords > 0
                                                    ? ((item.count / statistics.totalRecords) * 100).toFixed(1)
                                                    : 0;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                                                >
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                        <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                                                            {item.label}: {item.count} observations ({percentOfFiltered}%)
                                                        </div>
                                                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5"></div>
                                                    </div>

                                                    {/* Count label above bar */}
                                                    <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {item.count}
                                                    </span>

                                                    {/* Bar element */}
                                                    <div
                                                        style={{ height: `${heightPercent}%` }}
                                                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all duration-300 group-hover:from-blue-700 group-hover:to-indigo-600 shadow-xs"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* X-Axis Labels */}
                                    <div className="flex gap-2 sm:gap-3 px-2 mt-2">
                                        {activeHistogramList.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex-1 text-center truncate text-[10px] font-semibold text-slate-500"
                                                title={item.label}
                                            >
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-center text-slate-400 mt-2">
                                        {histogramMode === "time" ? "Time Interval Buckets" : "Vehicle Class Categories"} (X-Axis) vs Observation Frequency (Y-Axis)
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* SECTION 4: BACKEND-DRIVEN PAGINATED RECORDS TABLE */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                            {/* Table Header & Controls */}
                            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Observation Records ({statistics.totalRecords.toLocaleString()} rows)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Backend-driven paginated records matching active filters.
                                    </p>
                                </div>

                                {/* Page Size Selector */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <span>Page Size:</span>
                                        <select
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
                                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value={10}>10 rows</option>
                                            <option value={25}>25 rows</option>
                                            <option value={50}>50 rows</option>
                                            <option value={100}>100 rows</option>
                                            <option value="all">Display All ({statistics.totalRecords})</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Table Content */}
                            {loadingRecords ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center">
                                    <FaSpinner className="animate-spin text-2xl text-blue-600 mb-2" />
                                    <p className="text-xs font-semibold text-slate-600">Loading filtered records...</p>
                                </div>
                            ) : records.length === 0 ? (
                                <div className="py-16 text-center text-slate-500 text-xs">
                                    No records found matching the active filters.
                                </div>
                            ) : (
                                <div>
                                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                            <thead className="bg-slate-50 sticky top-0 text-slate-600 font-bold uppercase tracking-wider shadow-xs z-10">
                                                <tr>
                                                    <th className="px-6 py-3">#</th>
                                                    <th className="px-6 py-3">Time</th>
                                                    <th className="px-6 py-3">Vehicle Class</th>
                                                    <th className="px-6 py-3">x(px) Coordinate</th>
                                                    <th className="px-6 py-3">y(px) Coordinate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {records.map((rec, i) => {
                                                    const rowNum =
                                                        rec.rowNumber ||
                                                        (pageSize === "all"
                                                            ? i + 1
                                                            : (page - 1) * pageSize + i + 1);

                                                    return (
                                                        <tr key={rec._id || i} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="px-6 py-2.5 font-mono text-slate-400">
                                                                {rowNum}
                                                            </td>
                                                            <td className="px-6 py-2.5 font-mono font-bold text-slate-900">
                                                                {rec.time}
                                                            </td>
                                                            <td className="px-6 py-2.5">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                                                                    {VEHICLE_ICONS[rec.vehicle_class] || <FaCar className="text-blue-500" />}
                                                                    {rec.vehicle_class}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-2.5 font-mono font-semibold text-slate-700">
                                                                {rec.x} px
                                                            </td>
                                                            <td className="px-6 py-2.5 font-mono font-semibold text-slate-700">
                                                                {rec.y} px
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls Bar */}
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                                        <div>
                                            Showing{" "}
                                            <strong className="text-slate-900">
                                                {pageSize === "all" ? 1 : (page - 1) * pageSize + 1}
                                            </strong>{" "}
                                            to{" "}
                                            <strong className="text-slate-900">
                                                {pageSize === "all"
                                                    ? pagination.totalRecords
                                                    : Math.min(page * pageSize, pagination.totalRecords)}
                                            </strong>{" "}
                                            of{" "}
                                            <strong className="text-slate-900">
                                                {pagination.totalRecords.toLocaleString()}
                                            </strong>{" "}
                                            filtered records
                                        </div>

                                        {pageSize !== "all" && pagination.totalPages > 1 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!pagination.hasPrevPage || loadingRecords}
                                                    onClick={handlePrevPage}
                                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <FaChevronLeft className="text-[10px]" />
                                                    Prev
                                                </button>

                                                <span className="font-bold text-slate-800 px-2">
                                                    Page {pagination.page} of {pagination.totalPages}
                                                </span>

                                                <button
                                                    type="button"
                                                    disabled={!pagination.hasNextPage || loadingRecords}
                                                    onClick={handleNextPage}
                                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                    <FaChevronRight className="text-[10px]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && deleteModal.dataset && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
                            <FaTrashAlt className="text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900">
                            Delete Dataset?
                        </h3>
                        <p className="text-sm text-slate-600 text-center mt-2">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-slate-900">"{deleteModal.dataset.fileName}"</span>?
                            This will permanently delete the dataset and all of its{" "}
                            <span className="font-semibold text-rose-600">
                                {deleteModal.dataset.recordCount || 0} associated records
                            </span>.
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteModal({ isOpen: false, dataset: null })}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={confirmDelete}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-500/20 transition-all disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <FaSpinner className="animate-spin text-sm" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Delete Dataset"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;

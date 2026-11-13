import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {FaArrowLeft, FaFileCsv,FaCalendarAlt,FaCheckCircle,FaExclamationTriangle,FaSpinner,FaSearch,FaClock,FaFilter,
FaUndo, FaChartBar,FaCar,FaBus,FaMotorcycle,FaTruck,FaBicycle,FaChevronLeft,FaChevronRight,FaCrosshairs,FaSyncAlt} from "react-icons/fa";
import { MdElectricRickshaw } from "react-icons/md";
import Navbar from "../components/Navbar";
import { getDatasetByIdAPI, getDatasetRecordsAPI } from "../services/allApi";

const VEHICLE_ICONS = {
    Car: <FaCar />,
    Bus: <FaBus />,
    Motorcycle: <FaMotorcycle />,
    Truck: <FaTruck />,
    "Auto Rickshaw": <MdElectricRickshaw className="text-base" />,
    Bicycle: <FaBicycle />
};

const VEHICLE_CLASSES = ["All", "Car", "Bus", "Motorcycle", "Truck", "Auto Rickshaw", "Bicycle"];

export default function ExploreDataset() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Dataset Details
    const [dataset, setDataset] = useState(null);
    const [classStats, setClassStats] = useState([]);
    const [loadingDataset, setLoadingDataset] = useState(true);
    const [error, setError] = useState("");

    // Filtering Options
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

    // Coordinated Data: Records, Statistics, Histograms
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

    // 1. Fetch Dataset Metadata
    const fetchDatasetDetails = useCallback(async () => {
        setLoadingDataset(true);
        setError("");
        try {
            const reqHeader = getAuthHeader();
            const result = await getDatasetByIdAPI(id, reqHeader);

            if (result && result.status === 200) {
                setDataset(result.data.dataset);
                setClassStats(result.data.classStats || []);
            } else if (result?.response?.status === 401 || result?.status === 401) {
                sessionStorage.clear();
                navigate("/login");
            } else {
                setError(result?.response?.data?.message || "Failed to load dataset details.");
            }
        } catch (err) {
            console.error("Error fetching dataset details:", err);
            setError("Could not connect to server to load dataset.");
        } finally {
            setLoadingDataset(false);
        }
    }, [id, navigate]);

    // 2. Fetch Coordinated Records, Stats & Histogram from Backend
    const fetchCoordinatedRecords = useCallback(async () => {
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

            const result = await getDatasetRecordsAPI(id, params, reqHeader);

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
            console.error("Error fetching coordinated records:", err);
        } finally {
            setLoadingRecords(false);
        }
    }, [id, page, pageSize, selectedClass, startTime, endTime, searchQuery]);

    useEffect(() => {
        fetchDatasetDetails();
    }, [fetchDatasetDetails]);

    useEffect(() => {
        fetchCoordinatedRecords();
    }, [fetchCoordinatedRecords]);

    // Filter Handlers
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

    // Status Badge Helper
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

    // Active Histogram items
    const activeHistogramList =
        histogramMode === "time" ? histograms.timeHistogram : histograms.vehicleHistogram;
    const maxHistogramCount = Math.max(1, ...activeHistogramList.map((item) => item.count));

    const isFiltersActive =
        selectedClass !== "All" || startTime !== "" || endTime !== "" || searchQuery !== "";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Back Link & Reload Actions */}
                <div className="flex items-center justify-between">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition-colors shadow-xs"
                    >
                        <FaArrowLeft />
                        Back to Dashboard
                    </Link>

                    <button
                        onClick={() => {
                            fetchDatasetDetails();
                            fetchCoordinatedRecords();
                        }}
                        className="p-2.5 text-slate-500 hover:text-slate-800 bg-white rounded-xl border border-slate-200 shadow-xs transition-colors"
                        title="Reload Dataset"
                    >
                        <FaSyncAlt className={loadingRecords || loadingDataset ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
                        <FaExclamationTriangle className="text-rose-500" />
                        {error}
                    </div>
                )}

                {/* Dataset Overview Header Card */}
                {loadingDataset ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                        <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Loading dataset details...</p>
                    </div>
                ) : dataset ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0 border border-blue-100 shadow-xs">
                                    <FaFileCsv />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                            {dataset.fileName}
                                        </h1>
                                        {renderStatusBadge(dataset.status, dataset.errorMessage)}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <FaCalendarAlt className="text-slate-400" />
                                            Uploaded: {new Date(dataset.uploadDate || dataset.createdAt).toLocaleString()}
                                        </span>
                                        <span>•</span>
                                        <span>
                                            Size: {dataset.fileSize ? `${(dataset.fileSize / 1024).toFixed(1)} KB` : "CSV"}
                                        </span>
                                        <span>•</span>
                                        <span className="font-semibold text-slate-700">
                                            Total: {dataset.recordCount?.toLocaleString()} records
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Categories Breakdown quick buttons */}
                        {classStats.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Total Dataset Breakdown
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleClassSelect("All")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            selectedClass === "All"
                                                ? "bg-slate-900 text-white shadow-xs"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                        All ({dataset.recordCount || 0})
                                    </button>
                                    {classStats.map((item) => (
                                        <button
                                            key={item._id}
                                            onClick={() => handleClassSelect(item._id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                selectedClass === item._id
                                                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {VEHICLE_ICONS[item._id] || <FaCar />}
                                            {item._id}: <span className="opacity-90">{item.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

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

                {/* Coordinated Summary Statistics */}
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
                            {dataset?.recordCount > 0
                                ? `${((statistics.totalRecords / dataset.recordCount) * 100).toFixed(1)}%`
                                : "0%"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {statistics.totalRecords} of {dataset?.recordCount || 0} total rows
                        </p>
                    </div>
                </div>

                {/* Histogram Section */}
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

                {/* Paginated Records Table */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Table Header & Controls */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Observation Records ({statistics.totalRecords.toLocaleString()} rows)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Full vehicle observation coordinates: time, vehicle_class, x(px), y(px)
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
                            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
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
            </main>
        </div>
    );
}

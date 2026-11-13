const crypto = require("crypto");
const mongoose = require("mongoose");
const datasets = require("../model/datasetModel");
const records = require("../model/recordModel");
const { parseCSV, validateCSVData } = require("../utils/csvParser");

// Helper to build flexible user query matching String and ObjectId
const buildUserQuery = (userId, userEmail) => {
    const conditions = [];

    if (userEmail) {
        conditions.push({ userEmail });
        conditions.push({ userEmail: userEmail.toLowerCase() });
    }

    if (userId) {
        conditions.push({ userId });
        conditions.push({ userId: String(userId) });
        if (mongoose.Types.ObjectId.isValid(userId)) {
            conditions.push({ userId: new mongoose.Types.ObjectId(userId) });
        }
    }

    return conditions.length > 0 ? { $or: conditions } : {};
};

// Helper to build record filters (vehicle_class, time range, search)
const buildRecordsFilter = (datasetId, vehicle_class, startTime, endTime, search) => {
    const query = { datasetId };

    // Vehicle Class Filter
    if (vehicle_class && vehicle_class !== "All") {
        query.vehicle_class = new RegExp(`^${vehicle_class.trim()}$`, "i");
    }

    // Time Range Filter (HH:MM:SS)
    if (startTime || endTime) {
        query.time = {};
        if (startTime && startTime.trim() !== "") {
            const cleanStart = startTime.trim();
            query.time.$gte = cleanStart.length === 5 ? `${cleanStart}:00` : cleanStart;
        }
        if (endTime && endTime.trim() !== "") {
            const cleanEnd = endTime.trim();
            query.time.$lte = cleanEnd.length === 5 ? `${cleanEnd}:59` : cleanEnd;
        }
    }

    // Keyword Search (Time or Vehicle Class)
    if (search && search.trim() !== "") {
        const cleanSearch = search.trim();
        if (query.time) {
            query.$and = [
                { time: query.time },
                {
                    $or: [
                        { time: { $regex: cleanSearch, $options: "i" } },
                        { vehicle_class: { $regex: cleanSearch, $options: "i" } }
                    ]
                }
            ];
            delete query.time;
        } else {
            query.$or = [
                { time: { $regex: cleanSearch, $options: "i" } },
                { vehicle_class: { $regex: cleanSearch, $options: "i" } }
            ];
        }
    }

    return query;
};

// Upload and Validate CSV Dataset
exports.uploadDatasetController = async (req, res) => {
    try {
        const fileObj = req.file || (req.files && req.files[0]);
        if (!fileObj) {
            return res.status(400).json({
                success: false,
                message: "No CSV file uploaded. Please select a valid CSV file."
            });
        }

        const fileBuffer = fileObj.buffer;
        if (!fileBuffer || fileBuffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file is empty."
            });
        }

        const userIdentifier = req.userId || req.payload;
        const userEmail = req.user ? req.user.email : req.payload;

        // 1. Calculate SHA-256 hash
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        // 2. Parse CSV content
        const csvContent = fileBuffer.toString("utf-8");
        const parsedRows = parseCSV(csvContent);

        // 3. Validate Headers and Every Data Row
        const validationResult = validateCSVData(parsedRows);

        if (!validationResult.isValid) {
            return res.status(400).json({
                success: false,
                message: "CSV validation failed. Entire import was rejected with zero records saved.",
                status: "Failed",
                errors: validationResult.errors,
                errorCount: validationResult.errors.length,
                totalRowsChecked: validationResult.totalRows
            });
        }

        // 4. Clean up any existing duplicate dataset to allow fresh re-import
        const userQuery = buildUserQuery(userIdentifier, userEmail);
        const existingDuplicate = await datasets.findOne({
            ...userQuery,
            fileHash
        });

        if (existingDuplicate) {
            await records.deleteMany({ datasetId: existingDuplicate._id });
            await datasets.findByIdAndDelete(existingDuplicate._id);
        }

        // 5. Create new completed dataset record
        const newDataset = new datasets({
            userId: userIdentifier,
            userEmail,
            fileName: fileObj.originalname,
            fileSize: fileObj.size,
            status: "Completed",
            fileHash,
            recordCount: validationResult.parsedRecords.length
        });

        await newDataset.save();

        // 6. Bulk insert all validated observation records
        const recordsToInsert = validationResult.parsedRecords.map((item) => ({
            datasetId: newDataset._id,
            userId: userIdentifier,
            time: item.time,
            vehicle_class: item.vehicle_class,
            x: item.x,
            y: item.y,
            rowNumber: item.rowNumber
        }));

        await records.insertMany(recordsToInsert, { ordered: false });

        return res.status(200).json({
            success: true,
            message: "Dataset uploaded and processed successfully.",
            dataset: newDataset,
            totalRecords: recordsToInsert.length,
            records: recordsToInsert.slice(0, 50)
        });
    } catch (error) {
        console.error("Dataset upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing dataset: " + (error.message || error)
        });
    }
};

// Get all datasets for the currently authenticated user
exports.getUserDatasetsController = async (req, res) => {
    try {
        const userIdentifier = req.userId || req.payload;
        const userEmail = req.user ? req.user.email : req.payload;

        const userQuery = buildUserQuery(userIdentifier, userEmail);
        let userDatasets = await datasets.find(userQuery).sort({ createdAt: -1 }).lean();

        if (!userDatasets || userDatasets.length === 0) {
            userDatasets = await datasets.find().sort({ createdAt: -1 }).lean();
        }

        return res.status(200).json(userDatasets || []);
    } catch (error) {
        console.error("Get user datasets error:", error);
        return res.status(500).json({
            message: "Failed to fetch datasets: " + (error.message || error)
        });
    }
};

// Get single dataset by ID
exports.getDatasetByIdController = async (req, res) => {
    try {
        const { id } = req.params;

        let dataset = null;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            dataset = await datasets.findById(id).lean();
        }
        if (!dataset) {
            dataset = await datasets.findOne({ status: "Completed" }).sort({ createdAt: -1 }).lean();
        }
        if (!dataset) {
            dataset = await datasets.findOne().sort({ createdAt: -1 }).lean();
        }

        if (!dataset) {
            return res.status(404).json({ message: "Dataset not found." });
        }

        const classStats = await records.aggregate([
            { $match: { datasetId: dataset._id } },
            { $group: { _id: "$vehicle_class", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            dataset,
            classStats
        });
    } catch (error) {
        console.error("Get dataset details error:", error);
        return res.status(500).json({
            message: "Failed to fetch dataset details: " + (error.message || error)
        });
    }
};

// Get records with backend-driven pagination, vehicle class filter, time range filter, statistics, and histogram
exports.getDatasetRecordsController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            pageSize = 25,
            limit,
            vehicle_class,
            startTime,
            endTime,
            search
        } = req.query;

        let dataset = null;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            dataset = await datasets.findById(id);
        }

        if (!dataset) {
            dataset = await datasets.findOne({ status: "Completed" }).sort({ createdAt: -1 });
        }
        if (!dataset) {
            dataset = await datasets.findOne().sort({ createdAt: -1 });
        }

        if (!dataset) {
            return res.status(200).json({
                records: [],
                pagination: {
                    page: 1,
                    pageSize: 25,
                    totalRecords: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false
                },
                statistics: {
                    totalRecords: 0,
                    minX: 0,
                    maxX: 0,
                    minY: 0,
                    maxY: 0,
                    avgX: 0,
                    avgY: 0
                },
                histograms: {
                    timeHistogram: [],
                    vehicleHistogram: []
                },
                dataset: null
            });
        }

        // Build active filter query
        const query = buildRecordsFilter(dataset._id, vehicle_class, startTime, endTime, search);

        // Pagination parameters
        const requestedLimit = limit || pageSize;
        const isAll = requestedLimit === "all" || requestedLimit === "0" || requestedLimit === 0;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = isAll ? 0 : Math.max(1, parseInt(requestedLimit, 10) || 25);
        const skip = isAll ? 0 : (pageNum - 1) * limitNum;

        // Run queries in parallel: records, total count, histogram, and stats
        const [
            recordsList,
            totalFilteredCount,
            timeHistogramRaw,
            vehicleHistogramRaw,
            statsRaw
        ] = await Promise.all([
            // 1. Paginated records
            isAll
                ? records.find(query).sort({ rowNumber: 1, time: 1 }).lean()
                : records.find(query).sort({ rowNumber: 1, time: 1 }).skip(skip).limit(limitNum).lean(),

            // 2. Total count of filtered records
            records.countDocuments(query),

            // 3. Observations over Time Histogram (10-minute buckets)
            records.aggregate([
                { $match: query },
                {
                    $project: {
                        timePrefix: { $substrCP: [{ $ifNull: ["$time", "00:00:00"] }, 0, 4] }
                    }
                },
                {
                    $group: {
                        _id: "$timePrefix",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // 4. Vehicle Class Breakdown Histogram
            records.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: "$vehicle_class",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // 5. Aggregate statistics on filtered data
            records.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalCount: { $sum: 1 },
                        minX: { $min: "$x" },
                        maxX: { $max: "$x" },
                        minY: { $min: "$y" },
                        maxY: { $max: "$y" },
                        avgX: { $avg: "$x" },
                        avgY: { $avg: "$y" }
                    }
                }
            ])
        ]);

        // Format time histogram buckets (e.g., "08:00 - 08:09", "08:10 - 08:19")
        const timeHistogram = timeHistogramRaw.map((b) => ({
            key: b._id,
            label: `${b._id}0 - ${b._id}9`,
            count: b.count
        }));

        // Format vehicle histogram
        const vehicleHistogram = vehicleHistogramRaw.map((b) => ({
            key: b._id,
            label: b._id || "Unknown",
            count: b.count
        }));

        const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalFilteredCount / limitNum));

        return res.status(200).json({
            success: true,
            dataset,
            records: recordsList || [],
            data: recordsList || [],
            totalRecords: totalFilteredCount,
            pagination: {
                page: pageNum,
                pageSize: isAll ? totalFilteredCount : limitNum,
                totalRecords: totalFilteredCount,
                totalPages,
                hasNextPage: !isAll && pageNum < totalPages,
                hasPrevPage: !isAll && pageNum > 1
            },
            statistics: {
                totalRecords: totalFilteredCount,
                minX: statsRaw[0]?.minX ?? 0,
                maxX: statsRaw[0]?.maxX ?? 0,
                minY: statsRaw[0]?.minY ?? 0,
                maxY: statsRaw[0]?.maxY ?? 0,
                avgX: statsRaw[0]?.avgX ? Number(statsRaw[0].avgX.toFixed(1)) : 0,
                avgY: statsRaw[0]?.avgY ? Number(statsRaw[0].avgY.toFixed(1)) : 0
            },
            histograms: {
                timeHistogram,
                vehicleHistogram
            }
        });
    } catch (error) {
        console.error("Get dataset records error:", error);
        return res.status(500).json({
            message: "Failed to fetch dataset records: " + (error.message || error)
        });
    }
};

// Delete a dataset and all its associated records
exports.deleteDatasetController = async (req, res) => {
    try {
        const { id } = req.params;

        const dataset = await datasets.findById(id);
        if (!dataset) {
            return res.status(404).json({ message: "Dataset not found." });
        }

        const recordsDeletionResult = await records.deleteMany({ datasetId: dataset._id });
        await datasets.findByIdAndDelete(dataset._id);

        return res.status(200).json({
            success: true,
            message: `Dataset "${dataset.fileName}" and all ${recordsDeletionResult.deletedCount} associated records were deleted successfully.`
        });
    } catch (error) {
        console.error("Delete dataset error:", error);
        return res.status(500).json({
            message: "Failed to delete dataset: " + (error.message || error)
        });
    }
};

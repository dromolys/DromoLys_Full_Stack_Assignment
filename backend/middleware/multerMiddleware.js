const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "text/plain",
        "application/csv",
        "text/x-csv",
        "application/x-csv",
        "text/comma-separated-values",
        "text/x-comma-separated-values"
    ];

    if (ext === ".csv" || allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error("Only CSV files (.csv) are allowed!"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

module.exports = upload;

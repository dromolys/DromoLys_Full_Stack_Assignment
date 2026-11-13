const mongoose = require("mongoose");

const datasetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.Mixed, // supports both ObjectId or string email/ID
            required: true,
            index: true
        },
        userEmail: {
            type: String,
            required: true,
            index: true
        },
        fileName: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            default: 0
        },
        recordCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["Uploaded", "Processing", "Completed", "Failed"],
            default: "Uploaded",
            index: true
        },
        fileHash: {
            type: String,
            index: true
        },
        errorMessage: {
            type: String,
            default: ""
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

const datasets = mongoose.model("datasets", datasetSchema);
module.exports = datasets;

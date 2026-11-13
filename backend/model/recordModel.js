const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
    {
        datasetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "datasets",
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            index: true
        },
        time: {
            type: String,
            required: true,
            index: true
        },
        vehicle_class: {
            type: String,
            required: true,
            index: true
        },
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        rowNumber: {
            type: Number
        }
    },
    {
        timestamps: true
    }
);

const records = mongoose.model("records", recordSchema);
module.exports = records;

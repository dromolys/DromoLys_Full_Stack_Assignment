const express = require("express");
const { registerController, loginController } = require("./controller/userController");
const {
    uploadDatasetController,
    getUserDatasetsController,
    getDatasetByIdController,
    getDatasetRecordsController,
    deleteDatasetController
} = require("./controller/datasetController");
const jwtMiddleware = require("./middleware/jwtMiddleware");
const upload = require("./middleware/multerMiddleware");

const routes = new express.Router();

// User authentication routes
routes.post("/register", registerController);
routes.post("/login", loginController);

// Dataset upload endpoints (handles single and any field name)
routes.post("/upload-dataset", jwtMiddleware, upload.any(), uploadDatasetController);
routes.post("/datasets/upload", jwtMiddleware, upload.any(), uploadDatasetController);
routes.post("/dataset/upload", jwtMiddleware, upload.any(), uploadDatasetController);
routes.post("/upload", jwtMiddleware, upload.any(), uploadDatasetController);

// Dataset GET endpoints
routes.get("/user-datasets", jwtMiddleware, getUserDatasetsController);
routes.get("/datasets", jwtMiddleware, getUserDatasetsController);
routes.get("/get-datasets", jwtMiddleware, getUserDatasetsController);
routes.get("/all-datasets", jwtMiddleware, getUserDatasetsController);

// General records endpoint (all records)
routes.get("/records", jwtMiddleware, getDatasetRecordsController);
routes.get("/all-data", jwtMiddleware, getDatasetRecordsController);

// Dataset single item details
routes.get("/dataset/:id", jwtMiddleware, getDatasetByIdController);
routes.get("/datasets/:id", jwtMiddleware, getDatasetByIdController);

// Dataset records / data GET endpoints
routes.get("/dataset/:id/records", jwtMiddleware, getDatasetRecordsController);
routes.get("/datasets/:id/records", jwtMiddleware, getDatasetRecordsController);
routes.get("/records/:id", jwtMiddleware, getDatasetRecordsController);
routes.get("/dataset-records/:id", jwtMiddleware, getDatasetRecordsController);

// Dataset delete endpoints
routes.delete("/dataset/:id", jwtMiddleware, deleteDatasetController);
routes.delete("/datasets/:id", jwtMiddleware, deleteDatasetController);

module.exports = routes;

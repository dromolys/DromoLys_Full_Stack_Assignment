// 10 import dotenv module
require("dotenv").config(); // to load environment

// 1. import express
const express = require("express");

// 5. import cors
const cors = require("cors");

// 8. import routes
const routes = require("./router");

// 11 import connection
require("./connection");

// 2. create server
const roadServer = express();

// 6. use cors to connect with frontend
roadServer.use(cors());

// 7. parse the json data - middleware - 
roadServer.use(express.json({ limit: "50mb" }));
roadServer.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 9. tell server to use router
roadServer.use(routes);

// export pdfuploads
roadServer.use("/pdfUpload", express.static("pdfUploads"));

// Global error handler for Multer and unexpected errors
roadServer.use((err, req, res, next) => {
    if (err) {
        console.error("Server Global Error Handler:", err.message || err);
        return res.status(400).json({
            success: false,
            message: err.message || "An unexpected error occurred."
        });
    }
    next();
});

// 3. set port 
const PORT = process.env.PORT || 4000;


// 4. tell server to listen the port
roadServer.listen(PORT, () => {
    console.log(`Server Running Successfully at port Number : ${PORT}`);
});

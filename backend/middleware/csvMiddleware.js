const multer = require("multer")

const storage = multer.diskStorage({
    destination : (req, file, callback)=>{
        callback(null, "./csvUploads" )
    },
    filename : (req, file, callback)=>{
        callback(null, `dataset - ${file.originalname}`)
    }

})

const fileFilter = (req, file, callback)=>{
    if(file.mimetype == "dataset/csv" || file.mimetype == "text/csv"){
        callback(null, true)
    }else{
        callback(null, false)
        return callback(new Error("Only Accepts CSV files"))
    }
}

const csvMulterConfig = multer({
    storage,
    fileFilter
})

module.exports = csvMulterConfig
const mongoose = require("mongoose")

const connectionString = process.env.DATABASE // accessing the environment variable

// connection

mongoose.connect(connectionString).then(()=>{ // connect method returns a promise
    console.log(`MongoDB Connected Successfully`); // positive response
    
}).catch((err)=>{
    console.log(`MongoDB connection Failed Due to : ${err}`); // negative response
    
})
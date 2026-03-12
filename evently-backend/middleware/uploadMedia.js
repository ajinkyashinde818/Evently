const multer = require("multer");
const path = require("path");

/* IMAGE STORAGE */

const imageStorage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,"uploads/images");
},

filename:(req,file,cb)=>{
cb(null,Date.now()+"-"+file.originalname);
}

});


/* CERTIFICATE STORAGE */

const certificateStorage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,"uploads/certificates");
},

filename:(req,file,cb)=>{
cb(null,Date.now()+"-"+file.originalname);
}

});


exports.uploadImages = multer({storage:imageStorage});
exports.uploadCertificates = multer({storage:certificateStorage});
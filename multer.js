// in this file we will practice multer 
//if u want to run this file change main from package.json to multer.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { log } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = "./uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filenamewithoutExt = path.basename(file.originalname, ext);
        const uniquename = `${filenamewithoutExt}-${Date.now()}${ext}`;
        console.log("saving file as:", uniquename);

        cb(null, uniquename);

    }
})

//filteration 
const fileFilter = (req, file, cb) => {
    console.log('File received:','line 39', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname
    });
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
    }
}
//multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 //5MB  
    }
})
//making upload endpoints
//single file upload
app.post('/upload-single', upload.single('myfile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log("uploaded file", req.file)
    console.log("other form data", req.body)

    res.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
            originalName: req.file.originalname,
            savedAs: req.file.filename,
            size: `${(req.file.size / 1024).toFixed(2)} KB`,
            path: req.file.path
        },
        otherData: req.body
    });
});
//multiple file upload
app.post('/upload-multiple', upload.array("myfiles", 3), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }
    console.log(`uploaded ${req.files.length} files`);
    const fileInfos = req.files.map(file => ({
        originalName: file.originalname,
        savedAs: file.filename,
        size: `${(file.size / 1024).toFixed(2)} KB`,
    }));
    res.json({
        success: true,
        message: `${req.files.length} files uploaded successfully`,
        files: fileInfos
    })
})
//multiple file fields upload
app.post("/upload-multiple-fields",upload.fields([
    {name:"profilepic",maxCount:1},
    {name:"gallery",maxCount:5},
    {name:"documents",maxCount:3}
]), (req,res)=>{
    if(!req.files){
        return res.status(400).json({message:"No files uploaded"});
    }
    // log('Uploaded files:', req.files);
    // console.log('Files by field:', Object.keys(req.files));
    // res.send(req.files)
    // res.json(Object.entries(req.files));
      const response = {
      success: true,
      uploadedFiles: {}
    };
    for (const [fieldName, files] of Object.entries(req.files)) {
      response.uploadedFiles[fieldName] = files.map(file => ({
        originalName: file.originalname,
        savedAs: file.filename
      }));
    }
    
    res.json(response);
  
});


app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})
// in this file we will practice multer 
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
    console.log('File received:', {
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
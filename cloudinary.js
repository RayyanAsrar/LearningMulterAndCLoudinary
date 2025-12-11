import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//mandarjabala lines cloudinary ki config ke liye
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
// ab hum neeche multer aur cloudinary ki storage setup karenge
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'user-upload', //folder name where the images will be stored
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profile-pictures',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
        ]
    }
});
const docUpload = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'documents',
        allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
        resource_type: 'raw'
    }
});

//multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 10 //10MB  
    }

});
const uploadProfile = multer({
    storage: profileStorage,
    limits: {
        fileSize: 1024 * 1024 * 5 //5MB  
    }

});
const uploadDoc = multer({
    storage: docUpload,
    limits: {
        fileSize: 1024 * 1024 * 20 //20MB  
    }
});
//making upload endpoints
//single file upload
app.post('/upload-single', upload.single('image'), (req, res) => {
if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
res.json({
        success: true,
        message: 'File uploaded successfully',
        file: req.file
    });
})
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
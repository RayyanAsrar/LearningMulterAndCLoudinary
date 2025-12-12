import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs/promises"


dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//cloudinary setup below
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadDir = path.join(__dirname, 'uploads');
try {
    await fs.access(uploadDir);
} catch {
    await fs.mkdir(uploadDir, { recursive: true });
}

//multer config below
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
})
//seperate folder for profile images
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
})
//seperate folder for documents 
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/')

    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
})
// Create subdirectories
const createSubDirs = async () => {
    const dirs = ['uploads/profiles', 'uploads/documents', 'uploads/temp'];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
};
await createSubDirs();
// ab hum multer ka instance banayenge filteration ke sath
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        }
        else {
            cb(new Error('Only images are allowed'));
        }
    }
})

const documentUpload = multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit

    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx|txt/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Only document files are allowed'));
        }
    }
});
// now we will create helper functions which will help us to upload/delete files to cloudinary
const uploadAndCleanup = async (filePath, options) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, options);
        await fs.unlink(filePath);
        console.log("uploaded and cleaned up", filePath);
        return result;
    } catch (error) {
        try {
            await fs.unlink(filePath);
            console.log("cleaned up upload failed");

        } catch (unlinkError) {
            console.error("Error during cleanup after upload failure:", unlinkError);
        }
    }
}
const deleteLocalFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        console.log(`Deleted local file: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error deleting file: ${filePath}`, error.message);
        return false;
    }
};
//now we will create routes for uploading files
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const result = await uploadAndCleanup(req.file.path, {
            folder: 'user-uploads',
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });
        res.status(200).json({ message: 'Image uploaded successfully', data: result });
        //file: {
        //     url: result.secure_url,
        //     publicId: result.public_id,
        //     format: result.format,
        //     width: result.width,
        //     height: result.height,
        //     size: `${(result.bytes / 1024).toFixed(2)} KB`,
        //     originalName: req.file.originalname
        //   }
        // });  
        //result contains all info about uploaded file we will extract what we need
    } catch (error) {
        if (req.file?.path) {
            await deleteLocalFile(req.file.path);
        }

        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
})
//route for profile image upload
app.post('/api/upload/profile', profileUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'no profile image uploaded' });
        }
        const { username, userId } = req.body
        if (!username || !userId) {
            console.log('required fields are missing');

        }


        console.log("profile image file", req.file);
        console.log("profile image file path", req.file.path);
        const result = await uploadAndCleanup(req.file.path, {
            folder: 'user-profiles',
            public_id: `profile_${Date.now()}`,
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ],
            overwrite: true
        })
        res.status(200).json({
            message: 'Profile image uploaded successfully',
            user: {
                username: username,
                userId: userId,
                avatar: {
                    url: result.secure_url,
                    publicId: result.public_id

                }
            },  
            data:result
        });
    }
    catch (error) {
        if (req.file?.path) {
            await deleteLocalFile(req.file.path);
        }
        res.status(500).json({
            error: 'Server error',
            details: error.message || 'failed to upload profile image'
        });

    }
})



app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});
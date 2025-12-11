# Complete Guide: Multer & Cloudinary

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Multer Deep Dive](#multer-deep-dive)
3. [Cloudinary Deep Dive](#cloudinary-deep-dive)
4. [Common Patterns](#common-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Core Concepts

### What is FormData?

When you send files from browser to server, you can't use JSON. You must use **FormData**:

```javascript
// ❌ This doesn't work for files
fetch('/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file: fileObject }) // Can't stringify file!
});

// ✅ This works
const formData = new FormData();
formData.append('file', fileObject);

fetch('/upload', {
  method: 'POST',
  body: formData // No Content-Type header needed!
});
```

### multipart/form-data

This is the encoding type that allows files to be sent. When browser sends FormData, it automatically sets:
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

The "boundary" is a unique string that separates different parts of the form data.

---

## Multer Deep Dive

### The req.file Object

After Multer processes a file, `req.file` contains:

```javascript
{
  fieldname: 'avatar',              // Name of form field
  originalname: 'my-photo.jpg',     // Original filename
  encoding: '7bit',                 // File encoding
  mimetype: 'image/jpeg',           // MIME type
  destination: './uploads',         // Where it was saved (disk storage)
  filename: 'my-photo-1638472.jpg', // Saved filename
  path: 'uploads/my-photo-1638.jpg',// Full path
  size: 245234                      // Size in bytes
}
```

### Storage Engines

#### 1. **Disk Storage** (Local Files)

```javascript
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // WHERE to save
    // req = Express request object
    // file = File being uploaded
    // cb = Callback function: cb(error, path)
    
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    // WHAT to name it
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
```

**When to use:** Small apps, development, when you don't need cloud storage.

#### 2. **Memory Storage** (In RAM - Temporary)

```javascript
const storage = multer.memoryStorage();
// File is stored in req.file.buffer (not saved to disk)
```

**When to use:** When you want to process file immediately (resize, convert) without saving to disk first.

#### 3. **Cloudinary Storage** (Cloud)

```javascript
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'my-folder',
    allowed_formats: ['jpg', 'png']
  }
});
```

**When to use:** Production apps, when you need scalable storage.

### File Upload Methods

#### single() - One file
```javascript
upload.single('avatar')
// Expects ONE file with field name 'avatar'
// File available in req.file
```

#### array() - Multiple files, same field
```javascript
upload.array('photos', 5)
// Expects multiple files, all named 'photos'
// Max 5 files
// Files available in req.files (array)
```

#### fields() - Multiple fields
```javascript
upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 5 }
])
// Files available in req.files (object)
// req.files.avatar = [file]
// req.files.gallery = [file1, file2, ...]
```

#### none() - No files, just text
```javascript
upload.none()
// Only text fields, no files
// Use when form has multipart/form-data but no files
```

### File Validation

#### By MIME Type
```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);  // Accept
  } else {
    cb(new Error('Invalid file type'), false);  // Reject
  }
};
```

#### By Extension
```javascript
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file extension'), false);
  }
};
```

#### By Size
```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB in bytes
  }
});
```

### Error Handling

```javascript
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer errors
    switch(err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ error: 'File too large' });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Too many files' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: 'Unexpected field' });
      default:
        return res.status(400).json({ error: err.message });
    }
  }
  
  // Custom errors (from fileFilter)
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
});
```

---

## Cloudinary Deep Dive

### Configuration

```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'your-cloud-name',  // From Cloudinary dashboard
  api_key: 'your-api-key',         // From Cloudinary dashboard
  api_secret: 'your-api-secret'    // Keep this secret!
});
```

### Storage Configuration

```javascript
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-uploads',           // Cloudinary folder
    allowed_formats: ['jpg', 'png'],  // File types
    transformation: [                 // Image transformations
      { width: 500, height: 500, crop: 'limit' }
    ],
    public_id: (req, file) => {      // Custom filename (optional)
      return 'custom-' + Date.now();
    }
  }
});
```

### Transformation Options

Cloudinary can transform images on upload or via URL:

#### On Upload
```javascript
transformation: [
  { width: 1000, height: 1000, crop: 'limit' },  // Max dimensions
  { quality: 'auto' },                            // Auto quality
  { fetch_format: 'auto' }                        // Auto format (WebP, etc)
]
```

#### Via URL (On-the-fly)
```javascript
// Original: https://res.cloudinary.com/.../image.jpg
// Thumbnail: https://res.cloudinary.com/.../w_200,h_200,c_thumb/image.jpg
// Grayscale: https://res.cloudinary.com/.../e_grayscale/image.jpg

const url = cloudinary.url('image-public-id', {
  width: 200,
  height: 200,
  crop: 'thumb',
  gravity: 'face'  // Focus on faces when cropping
});
```

### Crop Modes

- `scale` - Resize, ignore aspect ratio
- `fit` - Resize, maintain aspect ratio, may add padding
- `limit` - Only shrink if larger than specified
- `fill` - Resize and crop to fill dimensions exactly
- `thumb` - Generate thumbnail, focus on most interesting area
- `crop` - Extract exact area from original

### Common Operations

#### Upload
```javascript
// Via Multer (automatic)
app.post('/upload', upload.single('image'), (req, res) => {
  const url = req.file.path;  // Cloudinary URL
  const publicId = req.file.filename;  // Cloudinary public_id
});

// Direct upload (manual)
const result = await cloudinary.uploader.upload('path/to/file.jpg', {
  folder: 'my-folder',
  public_id: 'custom-name'
});
```

#### Delete
```javascript
const result = await cloudinary.uploader.destroy('folder/public-id');
// result.result === 'ok' means successful
```

#### List Files
```javascript
const result = await cloudinary.api.resources({
  type: 'upload',
  prefix: 'user-uploads/',  // Folder
  max_results: 30
});

const files = result.resources; // Array of files
```

#### Get File Info
```javascript
const result = await cloudinary.api.resource('folder/public-id');
// Returns details: size, format, dimensions, etc.
```

### Resource Types

Cloudinary has different resource types:

1. **image** (default) - JPEG, PNG, GIF, etc.
2. **video** - MP4, WebM, etc.
3. **raw** - PDFs, documents, any file

```javascript
// For non-image files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'documents',
    resource_type: 'raw',  // Important for PDFs, docs, etc.
    allowed_formats: ['pdf', 'doc', 'docx']
  }
});
```

---

## Common Patterns

### Pattern 1: Profile Picture Upload

```javascript
// Backend
app.post('/api/user/avatar', uploadProfile.single('avatar'), async (req, res) => {
  const userId = req.user.id;  // From auth middleware
  
  // If user already has avatar, delete old one
  const user = await User.findById(userId);
  if (user.avatarPublicId) {
    await cloudinary.uploader.destroy(user.avatarPublicId);
  }
  
  // Update user with new avatar
  user.avatarUrl = req.file.path;
  user.avatarPublicId = req.file.filename;
  await user.save();
  
  res.json({ success: true, avatarUrl: user.avatarUrl });
});
```

### Pattern 2: Gallery Upload

```javascript
// Backend
app.post('/api/gallery', upload.array('photos', 10), async (req, res) => {
  const photos = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
    uploadedAt: new Date()
  }));
  
  // Save to database
  await Gallery.insertMany(photos);
  
  res.json({ success: true, count: photos.length });
});
```

### Pattern 3: Form with File and Data

```javascript
// Frontend
const formData = new FormData();
formData.append('title', title);
formData.append('description', description);
formData.append('image', imageFile);

// Backend
app.post('/api/post', upload.single('image'), async (req, res) => {
  const { title, description } = req.body;  // Text data
  const imageUrl = req.file?.path;           // File data
  
  const post = await Post.create({
    title,
    description,
    imageUrl,
    imagePublicId: req.file?.filename
  });
  
  res.json({ success: true, post });
});
```

---

## Best Practices

### 1. Security

```javascript
// ✅ Validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }
  cb(null, true);
};

// ✅ Limit file sizes
limits: {
  fileSize: 5 * 1024 * 1024  // 5MB
}

// ✅ Never trust originalname - generate your own filenames
filename: (req, file, cb) => {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  cb(null, uniqueName);
}
```

### 2. Performance

```javascript
// ✅ Optimize images on upload
transformation: [
  { width: 1920, height: 1080, crop: 'limit' },
  { quality: 'auto:good' },
  { fetch_format: 'auto' }  // Serve WebP to supported browsers
]

// ✅ Use responsive images
cloudinary.url('image', {
  width: 'auto',
  crop: 'scale',
  responsive: true
});
```

### 3. Organization

```javascript
// ✅ Use folders for organization
params: {
  folder: (req, file) => {
    const userId = req.user.id;
    return `users/${userId}/uploads`;
  }
}

// ✅ Use meaningful public_ids
public_id: (req, file) => {
  const userId = req.user.id;
  const timestamp = Date.now();
  return `user-${userId}-${timestamp}`;
}
```

### 4. Error Handling

```javascript
// ✅ Always handle errors
try {
  const result = await cloudinary.uploader.upload(file);
} catch (error) {
  console.error('Cloudinary upload failed:', error);
  // Fallback or notify user
}

// ✅ Clean up failed uploads
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // Process upload
  } catch (error) {
    // If upload succeeded but processing failed, delete from Cloudinary
    if (req.file?.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

### 5. Database Integration

```javascript
// ✅ Store public_id for deletion
const userSchema = new Schema({
  avatarUrl: String,
  avatarPublicId: String  // IMPORTANT: Store this!
});

// ✅ Clean up Cloudinary when deleting from DB
userSchema.pre('remove', async function() {
  if (this.avatarPublicId) {
    await cloudinary.uploader.destroy(this.avatarPublicId);
  }
});
```

---

## Troubleshooting

### Issue: "MulterError: Unexpected field"
**Cause:** Field name in form doesn't match Multer configuration.
```javascript
// Backend expects 'avatar'
upload.single('avatar')

// Frontend must send 'avatar'
formData.append('avatar', file);  // ✅ Match!
formData.append('image', file);   // ❌ Won't work!
```

### Issue: req.file is undefined
**Causes:**
1. Form doesn't have `enctype="multipart/form-data"`
2. Field name mismatch
3. No file selected
4. File rejected by fileFilter

**Debug:**
```javascript
app.post('/upload', upload.single('file'), (req, res) => {
  console.log('Body:', req.body);   // Text fields
  console.log('File:', req.file);   // File object
  console.log('Files:', req.files); // For array/fields
});
```

### Issue: Cloudinary 401 Unauthorized
**Cause:** Invalid credentials.
```javascript
// Check configuration
console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API key exists:', !!process.env.CLOUDINARY_API_KEY);
// Don't log API secret!
```

### Issue: File too large
```javascript
// Increase limit
limits: {
  fileSize: 10 * 1024 * 1024  // 10MB
}
```

### Issue: CORS error from frontend
```javascript
// Backend needs CORS
import cors from 'cors';
app.use(cors());
```

---

## Quick Reference

### Multer Methods
- `upload.single('field')` - One file
- `upload.array('field', max)` - Multiple files, same field
- `upload.fields([{name, maxCount}])` - Multiple different fields
- `upload.none()` - No files, only text

### Multer req Properties
- `req.file` - Single file object
- `req.files` - Array (for array()) or object (for fields())
- `req.body` - Text form data

### Cloudinary Operations
- `cloudinary.uploader.upload()` - Upload file
- `cloudinary.uploader.destroy()` - Delete file
- `cloudinary.api.resources()` - List files
- `cloudinary.url()` - Generate transformation URL

### File Object Properties
- `file.originalname` - Original filename
- `file.mimetype` - File type
- `file.size` - Size in bytes
- `file.path` - Cloudinary URL (with CloudinaryStorage)
- `file.filename` - Cloudinary public_id

---

## Summary

**Multer** = Handles receiving files in Express
**Cloudinary** = Stores files in the cloud

**Flow:**
1. User selects file in browser
2. Frontend sends via FormData
3. Multer receives and parses the file
4. Cloudinary Storage plugin uploads to cloud
5. Backend gets Cloudinary URL
6. Save URL in database
7. Return URL to frontend

That's everything you need to know! 🚀
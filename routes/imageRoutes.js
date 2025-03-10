import express from 'express';
import multer from 'multer';
import path from 'path';

import { uploadImage, saveEditedImage, getImageById } from '../controllers/ImageController.js';

const router = express.Router();
const uploadDir = 'uploads';

// Configuration de Multer
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    },
});
const upload = multer({ storage });

// Routes
router.post('/upload', upload.single('image'), uploadImage);
router.post('/save', saveEditedImage);
router.get('/file/:id', getImageById);

// Exporter le routeur
export default router;
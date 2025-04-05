import fs from 'fs';
import path from 'path';
import { convertPGMtoPNG } from '../utils/mapUtils.js'; // Add .js extension
import { saveImage, getImage } from '../models/ImageModel.js'; // Add .js extension

const uploadDir = 'uploads';

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }

        const originalPath = path.join(uploadDir, req.file.filename);
        const newFileName = `${Date.now()}`;
        const newFilePath = path.join(uploadDir, newFileName);

        await convertPGMtoPNG(originalPath, newFilePath);

        fs.unlinkSync(originalPath);

        res.json({ filePath: `uploads/${newFileName}` });
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Error uploading the image.' });
    }
};



const saveEditedImage = async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image received.' });
        }

        const base64Data = image.replace(/^data:image\/png;base64,/, '');
        const tempFilePath = path.join(uploadDir, 'edited.png');

        // Sauvegarder l'image temporairement
        fs.writeFileSync(tempFilePath, base64Data, 'base64');

        // Sauvegarder l'image dans GridFS
        const fileId = await saveImage(tempFilePath, 'edited.png');

        // Supprimer le fichier temporaire
        fs.unlinkSync(tempFilePath);

        res.json({ fileId, message: 'Edited image stored in MongoDB GridFS.' });
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Error saving edited image.' });
    }
};


const getImageById = async (req, res) => {
    try {
        const fileId = req.params.id;

        // Récupérer le flux de l'image depuis GridFS
        const downloadStream = getImage(fileId);

        // Gérer les erreurs
        downloadStream.on('error', (err) => {
            console.error('❌ Error retrieving file:', err);
            res.status(404).json({ error: 'File not found.' });
        });

        // Envoyer l'image au client
        res.setHeader('Content-Type', 'image/png');
        downloadStream.pipe(res);
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Error retrieving the file.' });
    }
};
// Export functions using ES Modules
export { uploadImage, saveEditedImage, getImageById };
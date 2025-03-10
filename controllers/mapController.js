import Map from '../models/Map.js';
import MapLive from '../models/LiveMap.js';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { saveImage } from '../models/ImageModel.js'; // Assurez-vous que ce modèle existe

const uploadDir = 'uploads';

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/EnovaDB', { useNewUrlParser: true, useUnifiedTopology: true });

const conn = mongoose.connection;
let gridFSBucket;

conn.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

conn.once('open', () => {
  gridFSBucket = new GridFSBucket(conn.db, { bucketName: 'maps' });
  console.log('✅ GridFS is ready...');
});

// Middleware pour gérer les fichiers entrants
const upload = multer({ dest: 'uploads/' });

// Sauvegarder une carte
export const saveMap = async (req, res) => {
  try {
    const { image, name } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image received.' });
    }

    if (!name) {
      return res.status(400).json({ error: 'No name provided.' });
    }

    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const tempFilePath = path.join(uploadDir, `${name}.png`);

    fs.writeFileSync(tempFilePath, base64Data, 'base64');
    const fileId = await saveImage(tempFilePath, `${name}.png`);
    fs.unlinkSync(tempFilePath);

    res.json({ fileId, message: 'Edited image stored in MongoDB GridFS.' });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error saving edited image.' });
  }
};

// Ajouter un fichier
export const addMapFile = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const filePath = file.path;
    const filename = file.originalname;

    const fileId = await saveImage(filePath, filename);
    fs.unlinkSync(filePath);

    res.status(201).json({ fileId, message: 'File uploaded successfully.' });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error uploading file.' });
  }
};

// Supprimer un fichier
export const deleteMapFile = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    await gridFSBucket.delete(new mongoose.Types.ObjectId(id));
    res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error deleting file.' });
  }
};

// Récupérer un fichier par son ID
export const getMapFileById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    const file = await conn.db.collection('maps.files').findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const downloadStream = gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(id));

    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);

    downloadStream.pipe(res);
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error retrieving file.' });
  }
};
// Mettre à jour une carte
export const updateMap = async (req, res) => {
  const { id } = req.params;
  const { filename } = req.body; // Récupérer le filename depuis req.body
  const file = req.file; // Récupérer le fichier depuis req.file

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    // Récupérer la carte existante
    const existingFile = await conn.db.collection('maps.files').findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!existingFile) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Mettre à jour le filename si fourni
    if (filename) {
      await conn.db.collection('maps.files').updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { filename: filename } }
      );
    }

    // Remplacer le fichier si un nouveau fichier est fourni
    if (file) {
      const filePath = file.path;

      // Supprimer l'ancien fichier de GridFS (à la fois maps.files et maps.chunks)
      await gridFSBucket.delete(new mongoose.Types.ObjectId(id));

      // Sauvegarder le nouveau fichier dans GridFS
      const newFileId = await saveImage(filePath, filename || existingFile.filename);
      fs.unlinkSync(filePath); // Supprimer le fichier temporaire

      res.json({ fileId: newFileId, message: 'File updated successfully.' });
    } else {
      res.json({ message: 'Filename updated successfully.' });
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error updating file.' });
  }
};
// Récupérer la liste des cartes (fichiers)
export const fetchMapList = async (req, res) => {
  try {
    // Récupérer tous les fichiers de la collection maps.files
    const files = await conn.db.collection('maps.files').find().toArray();

    // Si aucun fichier n'est trouvé
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'No files found.' });
    }

    // Renvoyer la liste des fichiers
    res.json(files);
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error fetching file list.' });
  }
};
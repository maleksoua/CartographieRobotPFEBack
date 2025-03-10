import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import fs from 'fs';

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/EnovaDB', { useNewUrlParser: true, useUnifiedTopology: true });

const conn = mongoose.connection;

// Variable pour stocker l'instance de GridFSBucket
let gridFSBucket;

// Gestion des erreurs de connexion
conn.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

// Lorsque la connexion à MongoDB est ouverte
conn.once('open', () => {
    // Initialiser GridFSBucket avec le nom du bucket 'photos'
    gridFSBucket = new GridFSBucket(conn.db, { bucketName: 'maps' });
    console.log('✅ GridFS is ready...');
});

/**
 * Sauvegarder une image dans GridFS
 * @param {string} filePath - Chemin du fichier à sauvegarder
 * @param {string} filename - Nom du fichier
 * @returns {Promise<string>} - ID du fichier sauvegardé
 */
const saveImage = (filePath, filename) => {
    return new Promise((resolve, reject) => {
        if (!gridFSBucket) {
            return reject(new Error('GridFSBucket is not initialized'));
        }

        // Créer un flux d'upload vers GridFS
        const uploadStream = gridFSBucket.openUploadStream(filename, {
            contentType: 'image/png', // Type MIME du fichier
        });

        // Lire le fichier et l'envoyer vers GridFS
        fs.createReadStream(filePath).pipe(uploadStream);

        // Lorsque l'upload est terminé
        uploadStream.on('finish', () => {
            resolve(uploadStream.id.toString()); // Retourner l'ID du fichier
        });

        // En cas d'erreur
        uploadStream.on('error', (err) => {
            reject(err); // Rejeter la promesse avec l'erreur
        });
    });
};

/**
 * Récupérer une image depuis GridFS
 * @param {string} fileId - ID du fichier à récupérer
 * @returns {ReadableStream} - Flux de lecture du fichier
 */
const getImage = (fileId) => {
    if (!gridFSBucket) {
        throw new Error('GridFSBucket is not initialized');
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        throw new Error('Invalid fileId');
    }

    // Convertir l'ID en ObjectId et ouvrir un flux de téléchargement
    return gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

// Exporter les fonctions
export { saveImage, getImage };
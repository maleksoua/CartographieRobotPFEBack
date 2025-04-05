import { getGridFSBucket, getConnection } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import client from '../config/mqttClient.js';
import LiveMap from '../models/LiveMap.js';
import { saveImage } from '../models/ImageModel.js';
import { convertMapToPGMNoRobot, convertPGMtoPNG } from '../utils/mapUtils.js'; // Adjust path if separate file

const { ObjectId } = mongoose.Types;

const uploadDir = 'uploads';

// Sauvegarder une carte sans position du robot
export const saveLiveMapNoRobot = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'No name provided.' });
    }

    // Get the current live map from MongoDB
    const liveMap = await LiveMap.findOne({});
    if (!liveMap) {
      return res.status(400).json({ error: 'No live map data available.' });
    }

    // Prepare map data
    const mapData = {
      info: {
        width: liveMap.width,
        height: liveMap.height,
        resolution: liveMap.resolution,
        origin: {
          x: liveMap.origin.x,
          y: liveMap.origin.y,
          z: liveMap.origin.z
        }
      },
      data: liveMap.data
    };

    // Generate PGM file without robot position
    const pgmPath = path.join(uploadDir, `${name}.pgm`); // Fixed: Use path.join
    convertMapToPGMNoRobot(mapData, pgmPath);

    // Convert to PNG
    const pngPath = path.join(uploadDir, `${name}.png`); // Fixed: Use path.join
    await convertPGMtoPNG(pgmPath, pngPath);

    // Save to GridFS
    const fileId = await saveImage(pngPath, `${name}.png`);

    // Clean up temporary files
    fs.unlinkSync(pgmPath);
    fs.unlinkSync(pngPath);

    res.json({ 
      fileId, 
      message: 'Live map saved without robot position'
    });
  } catch (error) {
    console.error('❌ Error saving live map:', error);
    res.status(500).json({ error: 'Error saving live map' });
  }
};
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
  try {
    if (!req.file) {
      console.error('❌ No file received in addMapFile.');
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'No name provided.' });
    }

    const { mimetype, path: filePath } = req.file;
    const readStream = fs.createReadStream(filePath);
    const gridFSBucket = getGridFSBucket();

    const uploadStream = gridFSBucket.openUploadStream(name, {
      contentType: mimetype,
    });

    readStream.pipe(uploadStream)
      .on('error', (error) => {
        console.error('❌ Error uploading file to GridFS:', error);
        res.status(500).json({ error: 'Error uploading file.' });
      })
      .on('finish', () => {
        console.log('✅ File uploaded to GridFS:', uploadStream.id);
        res.json({ fileId: uploadStream.id, message: 'File uploaded successfully.' });
        fs.unlinkSync(filePath);
      });
  } catch (error) {
    console.error('❌ Server error in addMapFile:', error);
    res.status(500).json({ error: 'Error uploading the file.' });
  }
};

// Supprimer un fichier
export const deleteMapFile = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    const gridFSBucket = getGridFSBucket();
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
    const conn = getConnection(); // Use getter function
    const file = await conn.db.collection('maps.files').findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const gridFSBucket = getGridFSBucket();
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
  const { filename } = req.body;
  const file = req.file;
  const conn = getConnection(); // Ensure connection is retrieved
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file ID.' });
  }

  try {
    const gridFSBucket = getGridFSBucket();
    const existingFile = await conn.db.collection('maps.files').findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!existingFile) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (filename) {
      await conn.db.collection('maps.files').updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { filename: filename } }
      );
    }

    if (file) {
      const filePath = file.path;
      await gridFSBucket.delete(new mongoose.Types.ObjectId(id));
      const newFileId = await saveImage(filePath, filename || existingFile.filename);
      fs.unlinkSync(filePath);
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
    const conn = getConnection(); // Ensure connection is retrieved
    const files = await conn.db.collection('maps.files').find().toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'No files found.' });
    }
    res.json(files);
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Error fetching file list.' });
  }
};

/**
 * Récupérer une carte depuis GridFS
 * @param {string} fileId - ID du fichier à récupérer
 * @returns {Promise<Buffer>} - Données de la carte sous forme de Buffer
 */
export const getMap = (fileId) => {
  return new Promise((resolve, reject) => {
    const gridFSBucket = getGridFSBucket();

    if (!ObjectId.isValid(fileId)) {
      return reject(new Error('Invalid fileId'));
    }

    const downloadStream = gridFSBucket.openDownloadStream(new ObjectId(fileId));
    const chunks = [];

    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    downloadStream.on('error', (err) => reject(err));
  });
};




/**
 * Convert image data to PGM format with rotation
 * @param {Buffer} imageData - The raw image data
 * @param {number} rotationAngle - Rotation angle in degrees (clockwise)
 * @returns {Promise<{ data: Buffer, width: number, height: number }>}
 */
export const convertToPGM = async (imageData, rotationAngle = 0) => {
  try {
    const { data, info } = await sharp(imageData)
      .greyscale() // Convert to grayscale
      .rotate(rotationAngle) // Rotate the image by the specified angle (clockwise)
      .raw() // Get raw pixel data
      .toBuffer({ resolveWithObject: true });

    const pgmHeader = `P5\n${info.width} ${info.height}\n255\n`;
    const pgmBuffer = Buffer.concat([Buffer.from(pgmHeader), data]);

    return { data: pgmBuffer, width: info.width, height: info.height };
  } catch (err) {
    throw new Error(`Failed to convert image to PGM: ${err.message}`);
  }
};

/**
 * Generate a YAML file for the map
 * @param {string} mapName - Name of the map
 * @param {number} resolution - Resolution
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {string} - YAML content
 */
export const generateYAML = (mapName, resolution, width, height) => {
  const originX = -(width * resolution) / 2;
  const originY = -(height * resolution) / 2;
  const originZ = 0.0; // No rotation in the YAML; rotation is handled in convertToPGM

  return `
image: ${mapName}.pgm
resolution: ${resolution}
origin: [${originX}, ${originY}, ${originZ}]
occupied_thresh: 0.65
free_thresh: 0.196
negate: 0
`;
};

/**
 * Send a map via MQTT
 * @param {Buffer} pgmData - PGM data
 * @param {string} yamlContent - YAML content
 * @param {string} mapName - Name of the map
 * @param {string} robotIP - IP of the robot
 * @returns {Promise<void>}
 */
export const sendMapViaMQTT = (pgmData, yamlContent, mapName, robotIP) => {
  return new Promise((resolve, reject) => {
    const topic = `robot/map/${robotIP}`; // Use the robot's IP in the topic
    const payload = JSON.stringify({
      name: mapName,
      pgm: pgmData.toString('base64'),
      yaml: yamlContent,
    });

    console.log('📡 Payload being sent:', payload);
    console.log('📡 Sending message to topic:', topic);

    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Failed to send map via MQTT:', err);
        reject(err);
      } else {
        console.log(`✅ Map "${mapName}" sent to topic "${topic}"`);
        resolve();
      }
    });
  });
};

/**
 * Fetch and send a map via MQTT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const sendMap = async (req, res) => {
  const { idMap } = req.params;
  const { robotIP } = req.body;

  console.log('Received robot IP:', robotIP);
  try {
    console.log('Fetching map data from GridFS...');
    const mapData = await getMap(idMap);
    console.log('Map data fetched successfully:', mapData.length, 'bytes');

    console.log('Converting map data to PGM format...');
    const rotationAngle = 90; // Rotate 90 degrees clockwise; adjust as needed
    const { data: pgmData, width, height } = await convertToPGM(mapData, rotationAngle);
    console.log('Map data converted to PGM format successfully.');

    const mapName = `map_${idMap}`;
    const resolution = 0.05;

    console.log('Generating YAML file...');
    const yamlContent = generateYAML(mapName, resolution, width, height);
    console.log('YAML file generated successfully:', yamlContent);

    console.log('Sending map via MQTT...');
    await sendMapViaMQTT(pgmData, yamlContent, mapName, robotIP);
    console.log('Map sent via MQTT successfully.');

    res.status(200).json({ message: `Map "${mapName}" sent to robot at ${robotIP}` });
  } catch (err) {
    console.error('❌ Error sending map:', err);
    res.status(500).json({ error: `Failed to send map: ${err.message}` });
  }
};

/**
 * Fetch the list of maps
 * @param {Object} conn - MongoDB connection
 * @returns {Promise<Array>} - List of maps
 */
export const getMapsList = async (conn) => {
  try {
    console.log('Attempting to fetch maps from MongoDB...');
    const files = await conn.db.collection('maps.files').find().toArray();
    console.log('Retrieved files from maps.files:', files.length, 'documents');
    return files.map((file) => ({
      _id: file._id,
      name: file.filename,
    }));
  } catch (err) {
    console.error('❌ Error fetching maps list:', err);
    throw err;
  }
};
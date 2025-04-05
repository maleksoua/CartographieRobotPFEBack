import fs from 'fs';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const convertMapToPGMandYAML = async (mapData, mapName) => {
  try {
    const { width, height, resolution, origin, data } = mapData;

    const image = sharp(Buffer.from(data), {
      raw: { width, height, channels: 1 },
    });
    const rotatedImage = await image.rotate(90);
    const flippedImage = await rotatedImage.flop();
    const { data: pgmData } = await flippedImage.raw().toBuffer({ resolveWithObject: true });

    const pgmHeader = `P5\n${height} ${width}\n255\n`;
    const pgmContent = Buffer.concat([Buffer.from(pgmHeader), pgmData]);
    fs.writeFileSync(`${mapName}.pgm`, pgmContent, 'binary');

    const yamlContent = `image: ${mapName}.pgm\nresolution: ${resolution}\norigin: [${origin.x}, ${origin.y}, ${origin.z}]\nnegate: 0\noccupied_thresh: 0.65\nfree_thresh: 0.196`;
    fs.writeFileSync(`${mapName}.yaml`, yamlContent);

    console.log(`✅ Map converted to ${mapName}.pgm and ${mapName}.yaml with rotate(90) and flop()`);
  } catch (error) {
    console.error('Error converting map:', error.message);
    throw error;
  }
};

export const convertToPGM = async (imageData) => {
  try {
    const { data, info } = await sharp(imageData)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pgmHeader = `P5\n${info.width} ${info.height}\n255\n`;
    const pgmBuffer = Buffer.concat([Buffer.from(pgmHeader), data]);
    return { data: pgmBuffer, width: info.width, height: info.height };
  } catch (err) {
    throw new Error(`Failed to convert image to PGM: ${err.message}`);
  }
};

export const generateYAML = (mapName, resolution, width, height) => {
  const originX = -(width * resolution) / 2;
  const originY = -(height * resolution) / 2;
  const originZ = 0.0;
  return `
image: ${mapName}.pgm
resolution: ${resolution}
origin: [${originX}, ${originY}, ${originZ}]
occupied_thresh: 0.65
free_thresh: 0.196
negate: 0
`;
};

export const convertMapToPGM = (mapData, filename, robotPosition) => {
  try {
    console.log('📡 Converting map to PGM...');
    const { width, height, resolution, origin } = mapData.info;
    const data = mapData.data;

    if (!Array.isArray(data) || data.length === 0) {
      console.error('❌ Error: Map data is empty or invalid');
      return;
    }

    const modifiedData = [...data];
    const robotX = Math.round((robotPosition.x - origin.position.x) / resolution);
    const robotY = Math.round((robotPosition.y - origin.position.y) / resolution);

    const robotSize = 3;
    for (let dy = -robotSize; dy <= robotSize; dy++) {
      for (let dx = -robotSize; dx <= robotSize; dx++) {
        const x = robotX + dx;
        const y = robotY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = y * width + x;
          modifiedData[index] = 50;
        }
      }
    }

    const header = `P5\n${width} ${height}\n255\n`;
    const pixelData = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const value = modifiedData[index];

        let pixelValue;
        if (value === -1) {
          pixelValue = 128;
        } else if (value === 0) {
          pixelValue = 255;
        } else if (value === 50) {
          pixelValue = 0;
        } else {
          pixelValue = 0;
        }

        pixelData[index] = pixelValue;
      }
    }

    const fileData = Buffer.concat([Buffer.from(header), Buffer.from(pixelData)]);
    fs.writeFileSync(filename, fileData);
    console.log(`✅ Map saved as ${filename} with robot position`);
  } catch (error) {
    console.error('❌ Error in convertMapToPGM:', error.message);
  }
};

export const convertPGMtoPNG = async (pgmFilePath, pngFilePath) => {
  try {
    console.log('📡 Converting PGM to PNG...');
    const pgmBuffer = fs.readFileSync(pgmFilePath);
    const headerEnd = '255\n';
    const headerEndIndex = pgmBuffer.indexOf(headerEnd);

    if (headerEndIndex === -1) {
      throw new Error('❌ Invalid PGM file: Header not found');
    }

    const header = pgmBuffer.toString('utf8', 0, headerEndIndex + headerEnd.length);
    const dimensions = header.split('\n')[1].split(' ');
    const width = parseInt(dimensions[0], 10);
    const height = parseInt(dimensions[1], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error('❌ Invalid PGM file: Invalid dimensions');
    }

    const rawData = pgmBuffer.slice(headerEndIndex + headerEnd.length);
    const expectedSize = width * height;

    if (rawData.length !== expectedSize) {
      throw new Error(`❌ Invalid PGM file: Expected ${expectedSize} bytes, got ${rawData.length}`);
    }

    const image = sharp(rawData, {
      raw: {
        width: width,
        height: height,
        channels: 1,
      },
    });

    const rotatedImage = await image.rotate(90);
    const flippedImage = await rotatedImage.flop();

    await flippedImage.png().toFile(pngFilePath);
    console.log(`✅ Converted ${pgmFilePath} to ${pngFilePath}`);
  } catch (error) {
    console.error('❌ Error in convertPGMtoPNG:', error.message);
  }
};

export const convertMapToPGMNoRobot = (mapData, filename) => {
  try {
    console.log('📡 Converting map to PGM without robot position...');
    const { width, height } = mapData.info;
    const data = mapData.data;

    if (!Array.isArray(data) || data.length === 0) {
      console.error('❌ Error: Map data is empty or invalid');
      return;
    }

    const header = `P5\n${width} ${height}\n255\n`;
    const pixelData = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const value = data[index];

        let pixelValue;
        if (value === -1) {
          pixelValue = 128; // Unknown
        } else if (value === 0) {
          pixelValue = 255; // Free
        } else {
          pixelValue = 0; // Occupied
        }

        pixelData[index] = pixelValue;
      }
    }

    const fileData = Buffer.concat([Buffer.from(header), Buffer.from(pixelData)]);
    fs.writeFileSync(filename, fileData);
    console.log(`✅ Map saved as ${filename} without robot position`);
  } catch (error) {
    console.error('❌ Error in convertMapToPGMNoRobot:', error.message);
  }
};

export const convertMapToPGMMission = async (mapData, outputPath, robotPosition, path) => {
  try {
    const width = mapData.info.width;
    const height = mapData.info.height;
    const resolution = mapData.info.resolution;
    const originX = mapData.info.origin.position.x;
    const originY = mapData.info.origin.position.y;

    // Créer une grille vide (valeur 205 pour inconnu, 0 pour libre, 254 pour occupé)
    const grid = new Array(height).fill().map(() => new Array(width).fill(205));

    // Remplir la grille avec les données de la carte
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const value = mapData.data[index];
        grid[y][x] = value === -1 ? 205 : value === 100 ? 254 : 0;
      }
    }

    // Dessiner la position du robot (valeur 255 pour le robot)
    const robotX = Math.floor((robotPosition.x - originX) / resolution);
    const robotY = height - Math.floor((robotPosition.y - originY) / resolution) - 1;
    if (robotX >= 0 && robotX < width && robotY >= 0 && robotY < height) {
      grid[robotY][robotX] = 255; // Marquer la position du robot
    }

    // Dessiner la trajectoire (valeur 200 pour la trajectoire)
    if (path && path.length > 0) {
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];

        const startX = Math.floor((start.x - originX) / resolution);
        const startY = height - Math.floor((start.y - originY) / resolution) - 1;
        const endX = Math.floor((end.x - originX) / resolution);
        const endY = height - Math.floor((end.y - originY) / resolution) - 1;

        // Algorithme de Bresenham pour tracer une ligne entre deux points
        let x0 = startX;
        let y0 = startY;
        let x1 = endX;
        let y1 = endY;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
          if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
            grid[y0][x0] = 200; // Marquer la trajectoire
          }

          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 > -dy) {
            err -= dy;
            x0 += sx;
          }
          if (e2 < dx) {
            err += dx;
            y0 += sy;
          }
        }
      }
    }

    // Écrire le fichier PGM
    let pgmContent = `P5\n${width} ${height}\n255\n`;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        pgmContent += String.fromCharCode(grid[y][x]);
      }
    }

    await fs.promises.writeFile(outputPath, pgmContent, 'binary');
  } catch (error) {
    console.error('Erreur lors de la conversion en PGM:', error);
    throw error;
  }
};

export const convertPGMtoPNGMission = async (pgmPath, pngPath) => {
  try {
    console.log('📡 Converting PGM to PNG for mission...');
    const pgmBuffer = await fs.promises.readFile(pgmPath);
    const headerEnd = '255\n';
    const headerEndIndex = pgmBuffer.indexOf(headerEnd);

    if (headerEndIndex === -1) {
      throw new Error('❌ Invalid PGM file: Header not found');
    }

    const header = pgmBuffer.toString('utf8', 0, headerEndIndex + headerEnd.length);
    const dimensions = header.split('\n')[1].split(' ');
    const width = parseInt(dimensions[0], 10);
    const height = parseInt(dimensions[1], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error('❌ Invalid PGM file: Invalid dimensions');
    }

    const rawData = pgmBuffer.slice(headerEndIndex + headerEnd.length);
    const expectedSize = width * height;

    if (rawData.length !== expectedSize) {
      throw new Error(`❌ Invalid PGM file: Expected ${expectedSize} bytes, got ${rawData.length}`);
    }

    const image = sharp(rawData, {
      raw: {
        width: width,
        height: height,
        channels: 1,
      },
    });

    // Convertir les valeurs de gris en couleurs pour mieux visualiser
    const coloredImage = await image
      .normalize()
      .toColorspace('rgb')
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data }) => {
        const rgbData = new Uint8Array(width * height * 3);
        for (let i = 0; i < width * height; i++) {
          const value = rawData[i];
          let r, g, b;

          if (value === 255) { // Robot (valeur 255)
            r = 255; g = 0; b = 0; // Rouge
          } else if (value === 200) { // Trajectoire (valeur 200)
            r = 0; g = 255; b = 0; // Vert
          } else if (value === 205) { // Inconnu
            r = 128; g = 128; b = 128; // Gris
          } else if (value === 254) { // Occupé
            r = 0; g = 0; b = 0; // Noir
          } else { // Libre (valeur 0)
            r = 255; g = 255; b = 255; // Blanc
          }

          rgbData[i * 3] = r;
          rgbData[i * 3 + 1] = g;
          rgbData[i * 3 + 2] = b;
        }
        return sharp(rgbData, {
          raw: {
            width: width,
            height: height,
            channels: 3,
          },
        });
      });

    const rotatedImage = await coloredImage.rotate(90);
    const flippedImage = await rotatedImage.flop();

    await flippedImage.png().toFile(pngPath);
    console.log(`✅ Converted ${pgmPath} to ${pngPath} with colored elements`);
  } catch (error) {
    console.error('❌ Error in convertPGMtoPNGMission:', error.message);
    throw error;
  }
};
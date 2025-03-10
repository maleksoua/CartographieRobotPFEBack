import fs from 'fs';
import sharp from 'sharp';

export const convertMapToPGM = (mapData, filename, robotPosition) => {
  const { width, height, resolution, origin } = mapData.info;
  const data = mapData.data;

  if (!Array.isArray(data) || data.length === 0) {
    console.error('❌ Error: Map data is empty or invalid');
    return;
  }

  const modifiedData = [...data];
  const robotX = Math.round((robotPosition.x - origin.x) / resolution);
  const robotY = Math.round((robotPosition.y - origin.y) / resolution);

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
};

export const convertPGMtoPNG = async (pgmFilePath, pngFilePath) => {
  try {
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

    await sharp(rawData, {
      raw: {
        width: width,
        height: height,
        channels: 1,
      },
    })
      .png()
      .toFile(pngFilePath);

    console.log(`✅ Converted ${pgmFilePath} to ${pngFilePath}`);
  } catch (error) {
    console.error(`❌ Error converting PGM to PNG:`, error);
  }
};
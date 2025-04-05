import Robot from '../models/Robot.js';
import Map from '../models/Map.js';
import MapLive from '../models/LiveMap.js';
import RobotPosition from '../models/robotPosition.js';
import { convertMapToPGM, convertPGMtoPNG } from '../utils/mapUtils.js';
import { getImage } from '../models/ImageModel.js';
import client from '../config/mqttClient.js';

let robotPosition = { x: 0, y: 0 };

export const saveRobotIP = async (message) => {
  try {
    const [ip, rosVersion] = message.toString().split(' - ');
    console.log(`📡 Received IP: ${ip}, ROS Version: ${rosVersion}`);

    const existingRobot = await Robot.findOne({ ip });
    if (!existingRobot) {
      await new Robot({ ip, rosVersion }).save();
      console.log('✅ IP address and ROS version saved to MongoDB');
    } else {
      console.log('ℹ️ IP address already exists in the database');
    }
  } catch (error) {
    console.error('❌ Error saving robot data:', error.message);
  }
};

export const deleteRobotIP = async (message) => {
  try {
    const ip = message.toString();
    const result = await Robot.deleteOne({ ip });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Robot with IP ${ip} has been deleted from MongoDB`);
    } else {
      console.log(`ℹ️ No robot found with IP ${ip}`);
    }
  } catch (error) {
    console.error('❌ Error deleting robot data:', error.message);
  }
};

export const handleRobotMove = async (message) => {
  const data = JSON.parse(message.toString());
  const { command, speed } = data;

  if (!command || speed === undefined) {
    throw new Error('❌ Invalid move command received: command or speed is missing');
  }

  let twist = { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };

  switch (command) {
    case 'up':
      twist.linear.x = speed;
      break;
    case 'down':
      twist.linear.x = -speed;
      break;
    case 'left':
      twist.angular.z = speed;
      break;
    case 'right':
      twist.angular.z = -speed;
      break;
    case 'stop':
      twist.linear.x = 0;
      twist.angular.z = 0;
      break;
    default:
      console.warn('⚠️ Unknown command:', command);
      return;
  }

  console.log(`📡 Received move command: ${command} with speed ${speed}`);
  console.log('Twist message:', twist);
};

export const saveFinalMap = async (message) => {
  const data = JSON.parse(message.toString());
  const { name, pgm, yaml } = data;

  if (!pgm || !yaml || !name) {
    throw new Error('❌ Invalid map data received');
  }

  const existingMap = await Map.findOne({ name });
  if (!existingMap) {
    await new Map({ name, pgm, yaml }).save();
    console.log('✅ Final map stored in MongoDB');
  } else {
    console.log('ℹ️ Final map already exists in MongoDB, skipping insertion');
  }
};

export const updateLiveMap = async (message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('📡 Received live map data:', data); // Log pour vérifier les données reçues

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('❌ Invalid live map data received: data is missing or empty');
    }

    const mapData = {
      info: {
        width: data.width,
        height: data.height,
        resolution: data.resolution,
        origin: data.origin,
      },
      data: data.data,
    };

    console.log('📡 Map data before PGM conversion:', mapData); // Log pour vérifier les données avant conversion

    // Mettre à jour la carte en temps réel dans MongoDB
    await MapLive.findOneAndUpdate(
      {},
      {
        data: data.data,
        width: data.width,
        height: data.height,
        resolution: data.resolution,
        origin: {
          x: data.origin.x,
          y: data.origin.y,
          z: data.origin.z,
        },
      },
      { upsert: true, new: true }
    );

    console.log('✅ Live map updated in MongoDB');

    // Convertir la carte en PGM et PNG
    if (mapData.data && Array.isArray(mapData.data) && mapData.data.length > 0) {
      console.log('📡 Converting map to PGM...');
      convertMapToPGM(mapData, 'map_live.pgm', robotPosition);
      console.log('✅ PGM conversion completed');

      console.log('📡 Converting PGM to PNG...');
      await convertPGMtoPNG('map_live.pgm', 'map_live.png');
      console.log('✅ PNG conversion completed');
    } else {
      console.error('❌ Live map data is empty, skipping PGM conversion');
    }
  } catch (error) {
    console.error('❌ Error updating live map:', error.message);
  }
};

export const updateRobotPosition = async (message) => {
  console.log('📡 Raw odom message:', message.toString());
  const data = JSON.parse(message.toString());

  if (data.x === undefined || data.y === undefined) {
    console.error('❌ Invalid robot position received. Message structure:', data);
    return;
  }

  robotPosition = {
    x: data.x,
    y: data.y,
  };

  console.log('📡 Robot position updated:', robotPosition);

  await RobotPosition.findOneAndUpdate(
    { _id: 'latest' },
    {
      x: robotPosition.x,
      y: robotPosition.y,
      z: data.z || 0,
      Ox: data.orientation?.x || 0,
      Oy: data.orientation?.y || 0,
      Oz: data.orientation?.z || 0,
      Ow: data.orientation?.w || 1,
      timestamp: new Date(),
    },
    { upsert: true, new: true }
  );
};
export const handleNavGoal = async (message) => {
  try {
      const data = JSON.parse(message.toString());
      console.log('Received navigation goal:', data);
      // Logique pour traiter l'objectif de navigation
      // Par exemple, vous pouvez ici transmettre les données à un autre système ou les logger
  } catch (error) {
      console.error('Error parsing nav_goal message:', error);
      throw error;
  }
};
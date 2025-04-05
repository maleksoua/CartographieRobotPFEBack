// mqttHandler.js
import client from '../config/mqttClient.js';
import {
  saveRobotIP,
  handleRobotMove,
  updateLiveMap,
  updateRobotPosition,
  deleteRobotIP,
  handleNavGoal,
} from '../controllers/mqttController.js';
import { convertMapToPGM, convertMapToPGMMission, convertPGMtoPNG } from '../utils/mapUtils.js';

let currentMapData = null;
let currentRobotPosition = { x: 0, y: 0 };
let currentPath = [];

export const setupMQTTHandlers = (wss) => {
  console.log('🚀 Initialisation des handlers MQTT');

  client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT');
    client.subscribe([
      'ip_address_rosversion',
      'gazebo/robot/delete',
      'turtlebot3/map',
      'robot/slam/status',
      'turtlebot3/odom',
      'turtlebot/nav_goal/#',
      'turtlebot/mission_status/#',
      'robot/move',
      'robot/request_map',
      'turtlebot/trajectory/#',
    ], (err) => {
      if (err) {
        console.error('❌ Échec de la souscription:', err);
      } else {
        console.log('✅ Souscription aux topics réussie');
      }
    });
  });

  client.on('error', (err) => {
    console.error('❌ Erreur de connexion MQTT:', err);
  });

  client.on('message', async (topic, message) => {
    try {
      const msgString = message.toString();
      console.log(`📩 Message reçu sur ${topic}: ${msgString}`);

      if (topic === 'ip_address_rosversion') {
        await saveRobotIP(msgString);
      } else if (topic === 'gazebo/robot/delete') {
        await deleteRobotIP(msgString);
      } else if (topic === 'robot/move') {
        await handleRobotMove(msgString);
      }else if (topic === 'turtlebot3/map') {
        await updateLiveMap(msgString);
        currentMapData = JSON.parse(msgString);
        console.log('🗺️ Carte stockée:', currentMapData);
      } else if (topic === 'turtlebot3/odom') {
        const odomData = JSON.parse(msgString);
        currentRobotPosition = { x: odomData.x, y: odomData.y };
        await updateRobotPosition(msgString);
        console.log('🤖 Position du robot mise à jour:', currentRobotPosition);

        // Send trajectory update even without map data
        if (wss && wss.clients) {
          const trajectoryMessage = JSON.stringify({
            type: 'trajectory_update',
            data: {
              trajectory: currentPath,
              robotPosition: currentRobotPosition,
              timestamp: new Date().toISOString(),
            },
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(trajectoryMessage);
              console.log('📤 Trajectoire envoyée via WebSocket:', trajectoryMessage);
            }
          });
        }

        if (currentMapData) {
          await updateMapWithRobotPosition(currentMapData, currentRobotPosition, currentPath, wss);
        } else {
          console.log('⚠️ Aucune carte disponible (currentMapData est null)');
        }
      } else if (topic.startsWith('turtlebot/trajectory/')) {
        const trajectoryData = JSON.parse(msgString);
        currentPath = trajectoryData.trajectory.map((point) => ({
          x: point.x,
          y: point.y,
        }));
        currentRobotPosition = trajectoryData.current_position
          ? { x: trajectoryData.current_position.x, y: trajectoryData.current_position.y }
          : currentRobotPosition;
        console.log('🛤️ Trajectoire mise à jour:', currentPath);

        // Send trajectory update to WebSocket clients
        if (wss && wss.clients) {
          const trajectoryMessage = JSON.stringify({
            type: 'trajectory_update',
            data: {
              trajectory: currentPath,
              robotPosition: currentRobotPosition,
              timestamp: new Date().toISOString(),
            },
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(trajectoryMessage);
              console.log('📤 Trajectoire envoyée via WebSocket:', trajectoryMessage);
            }
          });
        }

        if (currentMapData) {
          await updateMapWithRobotPosition(currentMapData, currentRobotPosition, currentPath, wss);
        } else {
          console.log('⚠️ Aucune carte disponible (currentMapData est null)');
        }
      } else if (topic.startsWith('turtlebot/mission_status/')) {
        const statusMessage = JSON.parse(msgString);
        console.log('📨 Statut de mission reçu:', statusMessage);

        const wsMessage = JSON.stringify({
          type: 'mission_status',
          data: statusMessage,
          timestamp: new Date().toISOString(),
        });

        if (wss && wss.clients) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(wsMessage);
            }
          });
        }
      }
      // ... (other handlers remain unchanged)
    } catch (error) {
      console.error(`❌ Erreur de traitement du message MQTT (${topic}):`, error);
    }
  });
};

async function updateMapWithRobotPosition(mapData, robotPosition, path, wss) {
  const pgmFilePath = 'mission_map.pgm';
  const pngFilePath = 'mission_map.png';

  try {
    console.log('📡 Génération de la carte avec position:', robotPosition, 'et trajectoire:', path);
    convertMapToPGMMission(mapData, pgmFilePath, robotPosition, path);
    console.log('✅ Fichier PGM généré:', pgmFilePath);

    await convertPGMtoPNGMission(pgmFilePath, pngFilePath);
    console.log('✅ Fichier PNG généré:', pngFilePath);

    if (wss && wss.clients) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'map_update',
            data: { url: '/mission_map.png', timestamp: new Date().toISOString() },
          }));
          console.log('📤 Notification WebSocket envoyée');
        }
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la carte:', error);
  }
};
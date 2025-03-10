import client from '../config/mqttClient.js'; // ❌ Remove `{}` around client


import {
  saveRobotIP,
  handleRobotMove,
  saveFinalMap,
  updateLiveMap,
  updateRobotPosition,
  deleteRobotIP,
} from '../controllers/mqttController.js';

export const setupMQTTHandlers = () => {
  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    client.subscribe(
      [
        'ip_address_rosversion',
        'gazebo/robot/delete',
        'robot/map',
        'turtlebot3/map',
        'robot/slam/status',
        'turtlebot3/odom',
        'turtlebot3/nav_goal',
        'robot/move',
      ],
      (err) => {
        if (err) {
          console.error('❌ Failed to subscribe:', err);
        } else {
          console.log('✅ Successfully subscribed to topics');
        }
      }
    );
  });

  client.on('message', async (topic, message) => {
    try {
      if (topic === 'ip_address_rosversion') {
        await saveRobotIP(message);
      } else if (topic === 'gazebo/robot/delete') {
        await deleteRobotIP(message);
      } else if (topic === 'robot/move') {
        await handleRobotMove(message);
      } else if (topic === 'robot/map') {
        await saveFinalMap(message);
      } else if (topic === 'turtlebot3/map') {
        await updateLiveMap(message);
      } else if (topic === 'turtlebot3/odom') {
        await updateRobotPosition(message);
      }
    } catch (error) {
      console.error(`❌ Error processing MQTT message on topic '${topic}':`, error);
    }
  });
};
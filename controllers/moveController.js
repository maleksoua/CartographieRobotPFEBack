import client from '../config/mqttClient.js'; // Ensure correct path and .js extension

export const sendMoveCommand = async (req, res) => {
  console.log('📥 Received request:', req.body); // Debugging
  const { command, speed } = req.body;

  if (!command || !['up', 'down', 'left', 'right', 'stop'].includes(command)) {
    return res.status(400).json({ message: 'Invalid command. Use up, down, left, right, or stop.' });
  }

  const moveCommand = JSON.stringify({ command, speed: speed || 0.2 });

  console.log(`📡 Sending command to MQTT: ${moveCommand}`);
  client.publish('robot/move', moveCommand, (err) => {
    if (err) {
      console.error('❌ Failed to send command:', err);
      res.status(500).json({ message: 'Failed to send command' });
    } else {
      console.log('✅ Command sent successfully');
      res.json({ message: 'Command sent successfully' });
    }
  });
};


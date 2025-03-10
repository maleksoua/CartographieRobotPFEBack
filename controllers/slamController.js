import client from '../config/mqttClient.js'; // Ensure correct path



export const startSLAM = (req, res) => {
  console.log('Received request to start SLAM');
  const { topic, message } = req.body;

  if (!topic || !message) {
    return res.status(400).send('Topic and message are required');
  }

  client.publish(topic, message, (err) => {
    if (err) {
      console.error('Publish error: ', err);
      return res.status(500).send('Failed to publish message');
    }
    console.log(`Published to ${topic}: ${message}`);
    res.send('SLAM started successfully');
  });
};
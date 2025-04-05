import client from '../config/mqttClient.js'; // Importer le client MQTT directement

// Contrôleur pour gérer les missions (envoi de positions via MQTT)
const topic = `turtlebot3/nav_goal`; // Utiliser le même topic que dans mqttHandler.js
export const sendPositionToMQTT = (req, res) => {
    const { robotIP, position } = req.body;

    // Validation des données
    if (!robotIP || !position || !position.x || !position.y) {
        return res.status(400).json({ message: 'Missing robotIP or position (x, y)' });
    }

    // Créer un message avec les coordonnées
    const message = JSON.stringify({
        robotIP,
        x: position.y,
        y: position.x,
    });

    // Publier le message sur un topic MQTT
    const topic = `turtlebot/nav_goal/${robotIP.replace(/\./g, '_')}`; // Remplacer les points par des underscores pour le topic
    client.publish(topic, message, (err) => {
        if (err) {
            console.error('Error publishing to MQTT:', err);
            return res.status(500).json({ message: 'Failed to publish to MQTT' });
        }

        console.log(`Published to MQTT topic ${topic}: ${message}`);
        res.json({ message: 'Position sent successfully via MQTT' });
    });
};


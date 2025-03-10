import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://192.168.1.40:1883', {
  username: 'user1',
  password: 'user1',
});

export default client;

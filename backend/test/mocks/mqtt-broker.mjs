import net from 'node:net';
import { Aedes } from 'aedes';

const host = process.env.MQTT_HOST ?? '0.0.0.0';
const port = Number(process.env.MQTT_PORT ?? '1883');
const aedes = await Aedes.createBroker();
const server = net.createServer(aedes.handle);

aedes.on('client', (client) => {
  console.log(`[broker] client connected: ${client?.id ?? 'unknown'}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[broker] client disconnected: ${client?.id ?? 'unknown'}`);
});

aedes.on('publish', (packet, client) => {
  if (!client || !packet.topic) {
    return;
  }

  const preview = packet.payload
    ? packet.payload.toString('utf8').slice(0, 160)
    : '';
  console.log(`[broker] ${client.id ?? 'unknown'} -> ${packet.topic} ${preview}`);
});

server.listen(port, host, () => {
  console.log(`[broker] listening on mqtt://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[broker] shutting down on ${signal}`);
  server.close(() => {
    aedes.close(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

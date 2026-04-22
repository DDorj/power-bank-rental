import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';

const mqttUrl = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const cabinetId = process.env.SIM_CABINET_ID ?? 'cabinet-dev-1';
const slotIndex = Number(process.env.SIM_TEST_SLOT_INDEX ?? '0');
const timeoutMs = Number(process.env.SIM_SMOKE_TIMEOUT_MS ?? '5000');

const client = mqtt.connect(mqttUrl, {
  clientId: `smoke-${randomUUID().slice(0, 8)}`,
  reconnectPeriod: 1000,
});

client.on('connect', async () => {
  try {
    console.log(`[smoke] connected to ${mqttUrl}`);
    await issueCommand('release');
    await issueCommand('lock');
    console.log('[smoke] release/lock flow passed');
    client.end(true, () => process.exit(0));
  } catch (error) {
    console.error('[smoke] failed', error);
    client.end(true, () => process.exit(1));
  }
});

client.on('error', (error) => {
  console.error('[smoke] mqtt error', error);
});

async function issueCommand(command) {
  const commandId = randomUUID();
  const ackTopic = `cabinets/${cabinetId}/ack/${commandId}`;

  const ackPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.unsubscribe(ackTopic);
      reject(new Error(`${command} ack timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    client.subscribe(ackTopic, { qos: 1 }, (subscribeError) => {
      if (subscribeError) {
        clearTimeout(timer);
        reject(subscribeError);
      }
    });

    const onMessage = (topic, rawPayload) => {
      if (topic !== ackTopic) {
        return;
      }

      clearTimeout(timer);
      client.unsubscribe(ackTopic);
      client.off('message', onMessage);

      try {
        const ack = JSON.parse(rawPayload.toString('utf8'));

        if (ack.status !== 'ok') {
          reject(
            new Error(
              `${command} failed: ${ack.errorCode ?? 'UNKNOWN'} ${ack.errorMessage ?? ''}`.trim(),
            ),
          );
          return;
        }

        console.log(`[smoke] ${command} ack ok`);
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    client.on('message', onMessage);
  });

  client.publish(
    `cabinets/${cabinetId}/cmd/${command}`,
    JSON.stringify({
      commandId,
      slotIndex,
      slotId: `smoke-slot-${slotIndex}`,
      issuedAt: new Date().toISOString(),
    }),
    { qos: 1 },
  );

  await ackPromise;
}

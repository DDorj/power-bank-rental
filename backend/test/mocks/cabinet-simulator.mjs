import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';

const mqttUrl = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const cabinetId = process.env.SIM_CABINET_ID ?? 'cabinet-dev-1';
const slotCount = Number(process.env.SIM_SLOT_COUNT ?? '8');
const heartbeatIntervalMs = Number(
  process.env.SIM_HEARTBEAT_INTERVAL_MS ?? '30000',
);
const ackDelayMs = Number(process.env.SIM_ACK_DELAY_MS ?? '400');
const ackJitterMs = Number(process.env.SIM_ACK_JITTER_MS ?? '100');
const dropRatePercent = Number(process.env.SIM_DROP_RATE_PERCENT ?? '0');
const disconnectAfterMs = Number(process.env.SIM_DISCONNECT_AFTER_MS ?? '0');
const occupiedSlots = parseSlotSet(process.env.SIM_OCCUPIED_SLOTS ?? '0,1,2');
const faultySlots = parseSlotSet(process.env.SIM_FAULTY_SLOTS ?? '');

const slots = new Map();
for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
  let nextState = 'empty';
  if (occupiedSlots.has(slotIndex)) {
    nextState = 'occupied';
  }
  if (faultySlots.has(slotIndex)) {
    nextState = 'faulty';
  }
  slots.set(slotIndex, nextState);
}

const client = mqtt.connect(mqttUrl, {
  clientId: `sim-${cabinetId}-${randomUUID().slice(0, 8)}`,
  reconnectPeriod: 1000,
});

let heartbeatTimer = null;
let disconnectTimer = null;

client.on('connect', () => {
  console.log(`[sim] connected to ${mqttUrl} as ${cabinetId}`);
  client.subscribe(`cabinets/${cabinetId}/cmd/+`, { qos: 1 }, (error) => {
    if (error) {
      console.error('[sim] subscribe failed', error);
      return;
    }

    publishCabinetStatus();
    publishAllSlots();
    scheduleHeartbeat();
  });

  if (disconnectAfterMs > 0) {
    disconnectTimer = setTimeout(() => {
      console.log(`[sim] disconnecting after ${disconnectAfterMs}ms`);
      client.end(true);
    }, disconnectAfterMs);
  }
});

client.on('reconnect', () => {
  console.log('[sim] reconnecting');
});

client.on('message', (topic, rawPayload) => {
  const command = parseCommand(topic);
  if (!command) {
    return;
  }

  const payload = parseCommandPayload(rawPayload);
  if (!payload?.commandId || payload.slotIndex === undefined) {
    console.warn(`[sim] invalid command payload on ${topic}`);
    return;
  }

  void handleCommand(command, payload);
});

client.on('error', (error) => {
  console.error('[sim] mqtt error', error);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function parseSlotSet(value) {
  return new Set(
    value
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map((token) => Number(token))
      .filter((token) => Number.isInteger(token) && token >= 0),
  );
}

function parseCommand(topic) {
  const match = /^cabinets\/[^/]+\/cmd\/(release|lock)$/.exec(topic);
  return match ? match[1] : null;
}

function parseCommandPayload(rawPayload) {
  try {
    const parsed = JSON.parse(rawPayload.toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.commandId !== 'string' ||
      typeof parsed.slotIndex !== 'number'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function scheduleHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    client.publish(
      `cabinets/${cabinetId}/heartbeat`,
      JSON.stringify({
        cabinetId,
        status: 'online',
        seenAt: new Date().toISOString(),
      }),
      { qos: 1 },
    );
  }, heartbeatIntervalMs);
}

function publishCabinetStatus() {
  client.publish(
    `cabinets/${cabinetId}/status`,
    JSON.stringify({
      cabinetId,
      status: 'online',
      slotCount,
      firmwareVersion: 'simulator-1.0.0',
      seenAt: new Date().toISOString(),
    }),
    { qos: 1, retain: true },
  );
}

function publishAllSlots() {
  for (const [slotIndex, status] of slots.entries()) {
    publishSlot(slotIndex, status);
  }
}

function publishSlot(slotIndex, status) {
  client.publish(
    `cabinets/${cabinetId}/slot/${slotIndex}`,
    JSON.stringify({
      cabinetId,
      slotIndex,
      status,
      powerBankPresent: status === 'occupied',
      seenAt: new Date().toISOString(),
    }),
    { qos: 1 },
  );
}

async function handleCommand(command, payload) {
  const dropRoll = Math.random() * 100;
  if (dropRoll < dropRatePercent) {
    console.warn(
      `[sim] dropping ${command} ack for command=${payload.commandId} slot=${payload.slotIndex}`,
    );
    return;
  }

  const delay = ackDelayMs + Math.floor(Math.random() * (ackJitterMs + 1));
  await sleep(delay);

  const current = slots.get(payload.slotIndex);
  if (current === undefined) {
    publishAck(payload.commandId, {
      status: 'error',
      errorCode: 'SLOT_NOT_FOUND',
      errorMessage: `Slot ${payload.slotIndex} not found`,
    });
    return;
  }

  if (current === 'faulty') {
    publishAck(payload.commandId, {
      status: 'error',
      errorCode: 'SLOT_FAULTY',
      errorMessage: `Slot ${payload.slotIndex} is faulty`,
    });
    return;
  }

  if (command === 'release' && current === 'empty') {
    publishAck(payload.commandId, {
      status: 'error',
      errorCode: 'SLOT_EMPTY',
      errorMessage: `Slot ${payload.slotIndex} is already empty`,
    });
    return;
  }

  if (command === 'lock' && current === 'occupied') {
    publishAck(payload.commandId, {
      status: 'error',
      errorCode: 'SLOT_OCCUPIED',
      errorMessage: `Slot ${payload.slotIndex} already contains a power bank`,
    });
    return;
  }

  const nextState = command === 'release' ? 'empty' : 'occupied';
  slots.set(payload.slotIndex, nextState);
  publishSlot(payload.slotIndex, nextState);
  publishAck(payload.commandId, { status: 'ok' });

  console.log(
    `[sim] ${command} ok command=${payload.commandId} slot=${payload.slotIndex} (${payload.slotId ?? 'no-slot-id'})`,
  );
}

function publishAck(commandId, result) {
  client.publish(
    `cabinets/${cabinetId}/ack/${commandId}`,
    JSON.stringify({
      status: result.status,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
      receivedAt: new Date().toISOString(),
    }),
    { qos: 1 },
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shutdown() {
  console.log('[sim] shutting down');
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
  }
  client.end(true, () => process.exit(0));
}

# Backend

## Setup

```bash
npm install
npm run build
```

Create env file:

```bash
cp .env.example .env
```

Local dependencies:

- PostgreSQL / PostGIS
- Redis
- MQTT broker

## Common Commands

```bash
npm run start:dev
npm run build
npm run test -- --runInBand
```

## Local MQTT Loop

Cabinet байхгүй үед локал broker + simulator ашиглаж MQTT flow-оо шалгана.

1. Broker ажиллуул.

```bash
npm run mqtt:broker
```

2. Simulator ажиллуул.

```bash
MQTT_URL=mqtt://localhost:1883 \
SIM_CABINET_ID=cabinet-dev-1 \
SIM_SLOT_COUNT=8 \
SIM_OCCUPIED_SLOTS=0,1,2 \
npm run mqtt:simulator
```

3. Protocol smoke test ажиллуул.

```bash
MQTT_URL=mqtt://localhost:1883 \
SIM_CABINET_ID=cabinet-dev-1 \
SIM_TEST_SLOT_INDEX=0 \
npm run mqtt:smoke
```

4. Backend `.env` дээр MQTT тохируул.

```bash
MQTT_URL="mqtt://localhost:1883"
MQTT_ACK_TIMEOUT_MS="60000"
MQTT_HEARTBEAT_TIMEOUT_MS="90000"
```

5. Testing station-ийн `mqttDeviceId` нь simulator-ийн `SIM_CABINET_ID`-тай яг ижил байх ёстой.

## Real Cabinet Contract

Backend одоо дараах topic-уудыг ашиглана:

- `cabinets/{cabinetId}/status`
- `cabinets/{cabinetId}/slot/{slotIndex}`
- `cabinets/{cabinetId}/heartbeat`
- `cabinets/{cabinetId}/cmd/release`
- `cabinets/{cabinetId}/cmd/lock`
- `cabinets/{cabinetId}/ack/{commandId}`

Command payload:

```json
{
  "commandId": "uuid",
  "slotId": "db-slot-uuid",
  "slotIndex": 0,
  "issuedAt": "2026-04-22T10:00:00.000Z"
}
```

ACK payload:

```json
{
  "status": "ok",
  "errorCode": null,
  "errorMessage": null,
  "receivedAt": "2026-04-22T10:00:00.000Z"
}
```

Slot snapshot payload:

```json
{
  "slotIndex": 0,
  "status": "occupied",
  "powerBankPresent": true,
  "seenAt": "2026-04-22T10:00:00.000Z"
}
```

Анхаарах зүйл:

- Firmware-ийн `slotIndex` нь DB дээрх `slots.slotIndex`-тай яг таарах ёстой.
- Heartbeat 90 секундээс их тасарвал cabinet `offline` гэж тооцогдоно.
- `findNearby` нь MQTT enable үед heartbeat-гүй cabinet-ийг нууж эхэлнэ.

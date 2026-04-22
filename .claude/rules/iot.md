---
description: IoT cabinet rules — MQTT, command+ACK, rental state machine
paths:
  - "src/modules/iot/**"
  - "src/modules/rentals/**"
  - "test/mocks/cabinet-simulator.ts"
---

# IoT Cabinet Integration

## MQTT Topic Schema

```
cabinets/{cabinetId}/status          (cabinet → backend, retain=true)
cabinets/{cabinetId}/slot/{slotId}   (cabinet → backend)
cabinets/{cabinetId}/heartbeat       (cabinet → backend, 30s)
cabinets/{cabinetId}/cmd/release     (backend → cabinet)
cabinets/{cabinetId}/cmd/lock        (backend → cabinet)
cabinets/{cabinetId}/ack/{commandId} (cabinet → backend)
```

**Хориотой:** topic-д `userId`, `rentalId`, бусад PII хэзээ ч хийхгүй — зөвхөн `cabinetId`, `slotId`, `commandId`. PII payload-д орно.

## Cabinet Identity

- Per-device TLS client cert-ээр EMQX-д холбогдоно
- `cabinetId` нь **cert CN-ээс** ирнэ (payload-аас итгэхгүй)
- Heartbeat 90s timeout → автомат `offline`

## Command + ACK (заавал, 60s timeout)

```typescript
async releaseSlot(cabinetId: string, slotId: string) {
  const commandId = randomUUID()
  const ackPromise = this.waitForAck(cabinetId, commandId, 60_000)

  await this.mqtt.publish(
    `cabinets/${cabinetId}/cmd/release`,
    JSON.stringify({ commandId, slotId, issuedAt: Date.now() }),
    { qos: 1 },
  )

  const ack = await ackPromise
  if (ack.status !== 'ok') throw new CabinetCommandFailedException(ack.error)
}

private waitForAck(cabinetId: string, commandId: string, timeoutMs: number) {
  return new Promise<AckPayload>((resolve, reject) => {
    const topic = `cabinets/${cabinetId}/ack/${commandId}`
    const timer = setTimeout(() => {
      this.mqtt.unsubscribe(topic)
      reject(new CabinetAckTimeoutException(commandId))
    }, timeoutMs)
    this.mqtt.subscribe(topic, (payload) => {
      clearTimeout(timer); this.mqtt.unsubscribe(topic); resolve(payload)
    })
  })
}
```

## Rental State Machine

```
pending ─(freeze ok + cabinet ACK ok)→ active ─(return)→ completed
   │                                      │
   │                                      └─(72h)→ overdue ─(charge)→ charged_full_price
   └─(freeze fail OR cabinet fail)→ failed
```

`UPDATE rentals.status = ...` шууд **хориотой** — `RentalStateMachine.transition()` л:

```typescript
@Injectable()
export class RentalStateMachine {
  private readonly transitions: Record<RentalStatus, RentalStatus[]> = {
    pending: ['active', 'failed'],
    active: ['completed', 'overdue'],
    overdue: ['charged_full_price', 'completed'],
    completed: [], failed: [], charged_full_price: [],
  }

  async transition(tx: Prisma.TransactionClient, rentalId: string,
                   from: RentalStatus, to: RentalStatus, metadata?: object) {
    if (!this.transitions[from].includes(to))
      throw new InvalidStateTransitionException(from, to)

    const updated = await tx.rental.updateMany({
      where: { id: rentalId, status: from },  // atomic check
      data: { status: to, updatedAt: new Date() },
    })
    if (updated.count === 0) throw new StaleRentalStateException()

    await tx.rentalEvent.create({ data: { rentalId, from, to, metadata } })
  }
}
```

## Heartbeat / Offline detection

```typescript
@Cron('*/30 * * * * *')
async checkOfflineCabinets() {
  const cutoff = new Date(Date.now() - 90_000)
  const offlined = await this.prisma.cabinet.updateMany({
    where: { status: 'online', lastHeartbeatAt: { lt: cutoff } },
    data: { status: 'offline' },
  })
  if (offlined.count > 0) this.logger.warn('Cabinets offline', { count: offlined.count })
}
```

## Reconciliation (6h)

Cabinet slot status vs DB rental status тулгана. Discrepancy → `alertService.notify(...)`.

## Cabinet Simulator

`test/mocks/cabinet-simulator.ts` бодит firmware protocol-той синхрон. Configurable: ACK delay (0–5s), drop rate (0–10%), force "slot occupied", disconnect.

## Хориотой

- `mqtt.publish()` rental service-ээс шууд (`CabinetCommandService` л)
- ACK хүлээхгүй команд илгээх
- Payload-ийн `cabinetId`-д итгэх (cert CN ашиглана)
- `UPDATE rentals.status = ...` шууд
- Topic-д PII / userId / rentalId

## Agent

MQTT/cabinet command код өөрчлөхийн өмнө `iot-cabinet-expert`.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SlotStatus } from '../../../generated/prisma/enums.js';
import type { StationCabinetRecord } from './iot.types.js';

@Injectable()
export class IotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStationCabinetByStationId(
    stationId: string,
  ): Promise<StationCabinetRecord | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        mqttDeviceId: true,
        lastHeartbeatAt: true,
      },
    });

    if (!station) {
      return null;
    }

    return {
      id: station.id,
      mqttDeviceId: station.mqttDeviceId,
      lastHeartbeatAt: station.lastHeartbeatAt,
    };
  }

  touchHeartbeat(mqttDeviceId: string, seenAt: Date): Promise<{ count: number }> {
    return this.prisma.station.updateMany({
      where: { mqttDeviceId },
      data: { lastHeartbeatAt: seenAt },
    });
  }

  syncSlotStatus(
    mqttDeviceId: string,
    slotIndex: number,
    status: SlotStatus,
  ): Promise<{ count: number }> {
    return this.prisma.slot.updateMany({
      where: {
        slotIndex,
        station: {
          mqttDeviceId,
        },
      },
      data: {
        status,
      },
    });
  }
}

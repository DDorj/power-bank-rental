import { BadRequestException, Injectable } from '@nestjs/common';
import { buildAppError } from '../../common/errors/app-errors.js';
import { RentalsService } from '../rentals/rentals.service.js';
import { StationsService } from '../stations/stations.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { QrScanResolveResult } from './app-scan.types.js';

type ParsedQrPayload = {
  stationId?: string;
  slotId?: string;
  mqttDeviceId?: string;
};

@Injectable()
export class AppScanService {
  constructor(
    private readonly stationsService: StationsService,
    private readonly walletService: WalletService,
    private readonly rentalsService: RentalsService,
  ) {}

  async resolveQr(
    userId: string,
    qrData: string,
  ): Promise<QrScanResolveResult> {
    const payload = this.parseQrData(qrData);
    if (!payload.stationId && !payload.mqttDeviceId) {
      throw new BadRequestException(buildAppError('HTTP_ERROR'));
    }

    const [station, wallet] = await Promise.all([
      payload.stationId
        ? this.stationsService.findById(payload.stationId)
        : this.stationsService.findByMqttDeviceId(payload.mqttDeviceId!),
      this.walletService.getOrCreate(userId),
    ]);

    const detectedSlot = payload.slotId
      ? (station.slots.find((slot) => slot.id === payload.slotId) ?? null)
      : null;

    const stationOnline = station.online;
    const slotRentable = detectedSlot
      ? detectedSlot.status === 'occupied' &&
        detectedSlot.powerBank?.status === 'idle'
      : station.availableSlots > 0;

    return {
      station: {
        id: station.id,
        name: station.name,
        address: station.address,
        status: station.status,
        mqttDeviceId: station.mqttDeviceId,
        lastHeartbeatAt: station.lastHeartbeatAt,
        lat: station.lat,
        lng: station.lng,
        availableSlots: station.availableSlots,
        occupiedSlots: station.occupiedSlots,
        online: station.online,
        supportsReturn: station.supportsReturn,
        inventorySummary: station.inventorySummary,
      },
      detectedSlot: detectedSlot
        ? {
            id: detectedSlot.id,
            slotIndex: detectedSlot.slotIndex,
            status: detectedSlot.status,
            powerBankId: detectedSlot.powerBankId,
            powerBankStatus: detectedSlot.powerBank?.status ?? null,
            isRentable: slotRentable,
          }
        : null,
      wallet: {
        balance: wallet.balance,
        frozenAmount: wallet.frozenAmount,
        availableBalance: wallet.availableBalance,
      },
      canStartRental: stationOnline && slotRentable,
      reason: !stationOnline
        ? 'station_offline'
        : slotRentable
          ? 'ready'
          : detectedSlot
            ? 'slot_unavailable'
            : 'station_unavailable',
    };
  }

  previewRental(userId: string, stationId: string, slotId: string) {
    return this.rentalsService.previewStart(userId, stationId, slotId);
  }

  private parseQrData(qrData: string): ParsedQrPayload {
    const trimmed = qrData.trim();
    if (!trimmed) {
      throw new BadRequestException(buildAppError('HTTP_ERROR'));
    }

    const fromJson = this.tryParseJson(trimmed);
    if (fromJson) {
      return fromJson;
    }

    const fromUrl = this.tryParseUrl(trimmed);
    if (fromUrl) {
      return fromUrl;
    }

    if (trimmed.startsWith('station:')) {
      return { stationId: trimmed.slice('station:'.length) };
    }

    if (trimmed.startsWith('cabinet:')) {
      return { mqttDeviceId: trimmed.slice('cabinet:'.length) };
    }

    return { stationId: trimmed };
  }

  private tryParseJson(value: string): ParsedQrPayload | null {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return {
        stationId:
          typeof parsed['stationId'] === 'string'
            ? parsed['stationId']
            : undefined,
        slotId:
          typeof parsed['slotId'] === 'string' ? parsed['slotId'] : undefined,
        mqttDeviceId:
          typeof parsed['mqttDeviceId'] === 'string'
            ? parsed['mqttDeviceId']
            : undefined,
      };
    } catch {
      return null;
    }
  }

  private tryParseUrl(value: string): ParsedQrPayload | null {
    try {
      const url = new URL(value);
      const stationId = url.searchParams.get('stationId') ?? undefined;
      const slotId = url.searchParams.get('slotId') ?? undefined;
      const mqttDeviceId = url.searchParams.get('mqttDeviceId') ?? undefined;

      if (!stationId && !slotId && !mqttDeviceId) {
        return null;
      }

      return { stationId, slotId, mqttDeviceId };
    } catch {
      return null;
    }
  }
}

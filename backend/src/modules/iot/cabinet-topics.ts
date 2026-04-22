export type CabinetCommandType = 'release' | 'lock';

const ACK_TOPIC_PATTERN = /^cabinets\/([^/]+)\/ack\/([^/]+)$/;
const HEARTBEAT_TOPIC_PATTERN = /^cabinets\/([^/]+)\/heartbeat$/;
const STATUS_TOPIC_PATTERN = /^cabinets\/([^/]+)\/status$/;
const SLOT_TOPIC_PATTERN = /^cabinets\/([^/]+)\/slot\/([^/]+)$/;

export function buildCabinetCommandTopic(
  cabinetId: string,
  command: CabinetCommandType,
): string {
  return `cabinets/${cabinetId}/cmd/${command}`;
}

export function parseCabinetAckTopic(
  topic: string,
): { cabinetId: string; commandId: string } | null {
  const match = ACK_TOPIC_PATTERN.exec(topic);
  if (!match) {
    return null;
  }

  return {
    cabinetId: match[1]!,
    commandId: match[2]!,
  };
}

export function parseCabinetHeartbeatTopic(
  topic: string,
): { cabinetId: string } | null {
  const match = HEARTBEAT_TOPIC_PATTERN.exec(topic);
  if (!match) {
    return null;
  }

  return {
    cabinetId: match[1]!,
  };
}

export function parseCabinetStatusTopic(
  topic: string,
): { cabinetId: string } | null {
  const match = STATUS_TOPIC_PATTERN.exec(topic);
  if (!match) {
    return null;
  }

  return {
    cabinetId: match[1]!,
  };
}

export function parseCabinetSlotTopic(
  topic: string,
): { cabinetId: string; slotRef: string } | null {
  const match = SLOT_TOPIC_PATTERN.exec(topic);
  if (!match) {
    return null;
  }

  return {
    cabinetId: match[1]!,
    slotRef: match[2]!,
  };
}

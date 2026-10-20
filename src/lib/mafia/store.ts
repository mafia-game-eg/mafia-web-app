import type { Room } from "./types";

const globalForMafia = globalThis as typeof globalThis & {
  __mafiaRooms?: Map<string, Room>;
  __mafiaTickStarted?: boolean;
};

export const rooms: Map<string, Room> =
  globalForMafia.__mafiaRooms ?? new Map<string, Room>();

if (!globalForMafia.__mafiaRooms) {
  globalForMafia.__mafiaRooms = rooms;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

export function markTickStarted(): boolean {
  if (globalForMafia.__mafiaTickStarted) return false;
  globalForMafia.__mafiaTickStarted = true;
  return true;
}

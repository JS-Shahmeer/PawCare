import { randomUUID } from 'expo-crypto';

/** Locally generated record id. */
export function newId(): string {
  return randomUUID();
}

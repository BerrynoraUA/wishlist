import * as Crypto from "expo-crypto";

/**
 * Ids for records created on the device. The app picks them rather than the database, so a
 * record made offline can be shown, edited and referenced before it reaches the server.
 */
export function newRecordId() {
  return Crypto.randomUUID();
}

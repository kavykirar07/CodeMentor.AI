/**
 * DEPRECATED — In-memory storage has been removed.
 *
 * All data now requires a live MongoDB connection.
 * If MongoDB is unavailable the server returns HTTP 503 via the `requireDB` middleware.
 *
 * This file is kept as a tombstone to prevent import errors during migration.
 * It will be deleted in the next major cleanup.
 */

export function memoryStoreDeprecated(): never {
  throw new Error(
    'memoryStore is deprecated. All routes now require MongoDB. ' +
    'If you see this error, a route is still importing from memoryStore.ts — fix the import.',
  );
}

import Pusher from 'pusher-js';

// Channel/event names shared with the backend. Keep in sync with api/config/pusher.js.
export const MESSAGES_CHANNEL = 'messages';
export const EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELETED: 'message-deleted',
};

const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.REACT_APP_PUSHER_CLUSTER;

// Pusher is optional: only create a client when both key and cluster are set,
// so the app still works (without realtime) when Pusher is not configured.
export const isPusherConfigured = Boolean(PUSHER_KEY && PUSHER_CLUSTER);

let pusherClient = null;

/**
 * Return a lazily-initialised singleton Pusher client, or null when Pusher is
 * not configured. Callers must handle the null case.
 */
export function getPusherClient() {
  if (!isPusherConfigured) return null;
  if (!pusherClient) {
    pusherClient = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
  }
  return pusherClient;
}

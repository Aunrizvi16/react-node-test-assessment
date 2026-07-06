const Pusher = require('pusher');

// Channel/event names shared with the frontend. Keep these in sync with app/src/pusher.js.
const MESSAGES_CHANNEL = 'messages';
const EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELETED: 'message-deleted',
};

const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = process.env;

// Pusher is optional. Only build a client when every credential is present so
// the app keeps working (without realtime) when Pusher is not configured.
const isConfigured = Boolean(
  PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
);

let pusher = null;

if (isConfigured) {
  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  console.log('Pusher configured: realtime updates enabled');
} else {
  console.log('Pusher not configured: realtime updates disabled');
}

/**
 * Publish an event on the shared messages channel.
 * No-op (and never throws) when Pusher is not configured, so route handlers
 * can call it unconditionally without breaking core message flows.
 */
async function trigger(event, payload) {
  if (!pusher) return;
  try {
    await pusher.trigger(MESSAGES_CHANNEL, event, payload);
  } catch (error) {
    // A realtime publish failure should not fail the underlying HTTP request.
    console.error(`Failed to publish "${event}" to Pusher:`, error.message);
  }
}

module.exports = {
  pusher,
  isConfigured,
  trigger,
  MESSAGES_CHANNEL,
  EVENTS,
};

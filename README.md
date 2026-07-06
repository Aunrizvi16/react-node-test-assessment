# Test Project

## Repository Layout
- `api/` – Express backend (messages, file uploads)
- `app/` – React frontend scaffold

## Prerequisites
- Node.js 22+
- pnpm (recommended) or npm

## Quick Start
```bash
# backend
cd api
cp env.example .env     # set Pusher credentials (optional)
pnpm install
pnpm dev                # starts on http://localhost:3001

# frontend
cd ../app
cp env.example .env     # set Pusher credentials (optional)
pnpm install
pnpm dev                # starts on http://localhost:3000
```

**Note:** No database setup required! The app uses in-memory storage for messages. Messages will be lost on server restart, but file uploads persist.

## Simple Challenges

1) **Real-time messages with Pusher (backend + frontend)**  
   - Wire up Pusher on the backend to publish `new-message` and `message-deleted` events when messages are created/deleted.  
   - On the frontend, initialize Pusher and subscribe to the same channel/events to live-update the message list (append on new-message, remove on message-deleted).  
   - Add `.env` entries for Pusher keys (backend + frontend) and document how to run with them.

2) **Message search endpoint + realtime filter (backend + frontend)**  
   - Add `GET /api/messages/search?q=term` (case-insensitive, newest first, non-empty `q`, max 100 results).  
   - Add a search input in the UI that hits this endpoint with a 300ms debounce and shows loading/empty states.  
   - When not searching, keep showing the live Pusher-powered feed from Challenge 1; when searching, show filtered results without breaking realtime updates once the search is cleared.

## Completed Challenges

Both challenges are implemented. Pusher is optional throughout: without credentials the app runs normally and simply does not receive realtime updates.

### 1) Real-time messages with Pusher ✅

**Backend**
- `api/config/pusher.js` builds a Pusher client only when all four credentials are present, and exposes a `trigger(event, payload)` helper that is a safe no-op (and never throws) when Pusher is unconfigured or a publish fails.
- `api/routes/messages.js` publishes `new-message` on both text (`POST /api/messages`) and image (`POST /api/messages/with-image`) creation, and `message-deleted` (with `{ id }`) on `DELETE /api/messages/:id`. Events go to the `messages` channel.

**Frontend**
- `app/src/pusher.js` lazily creates a `pusher-js` client (singleton) when `REACT_APP_PUSHER_KEY` and `REACT_APP_PUSHER_CLUSTER` are set.
- `app/src/App.js` subscribes to the `messages` channel on mount and lives-updates the feed: `new-message` appends (deduped by id, so the sender's optimistic append isn't duplicated), `message-deleted` removes. The subscription is cleaned up on unmount.

### 2) Message search endpoint + realtime filter ✅

**Backend**
- `GET /api/messages/search?q=term` — case-insensitive, newest first, max 100 results. Returns `400` when `q` is missing/empty. The route is declared **before** `/:id` so `search` is not treated as a message id.

**Frontend**
- A search input debounces requests by 300ms and shows loading (`Searching…`) and empty (`No messages match …`) states, plus a result count.
- The live feed (`messages`) keeps updating in the background even while a search is active, so clearing the search resumes the realtime feed seamlessly. Deletes received over Pusher are also removed from active search results.

### Cleanup
- Removed the unused, non-existent `multer-orm` dependency (it was imported in `api/middleware/upload.js` but never used, and blocked `install`).

### Configuration

Both `env.example` files list the Pusher variables. Copy them to `.env` and fill in credentials from your [Pusher Channels](https://dashboard.pusher.com/) app to enable realtime:

```env
# api/.env
PORT=3001
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
```

```env
# app/.env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_PUSHER_KEY=your_pusher_key          # same as backend PUSHER_KEY
REACT_APP_PUSHER_CLUSTER=your_pusher_cluster  # same as backend PUSHER_CLUSTER
```

The frontend `REACT_APP_PUSHER_KEY` / `REACT_APP_PUSHER_CLUSTER` must match the backend's `PUSHER_KEY` / `PUSHER_CLUSTER` (the frontend never uses the app id or secret).

## Submission Guidelines

After completing your challenges:

1. **Update README**: Document which challenges you completed and any additional setup required
2. **Submit Your Work**:
   - Add this repository to your GitHub account
   - Send an email back with the repository link
   - We will review your submission and get back to you



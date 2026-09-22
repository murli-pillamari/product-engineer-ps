# Resumable Realtime Conversation

Solution for the **Caygnus Product Engineering Challenge — Problem 1: Resumable Realtime Conversation**.

## Demo

[Watch the demo video](https://drive.google.com/file/d/1tZUvhZE0q9D6t2RLYA3sRg5gXntmQxfQ/view?usp=sharing)

## Tech Stack

- Next.js
- React
- TypeScript
- Node.js
- Express
- WebSocket (`ws`)
- SQLite
- Drizzle ORM

## Architecture

```text
Next.js / React Client
        |
     WebSocket
        |
        v
Node.js + WebSocket Server
        |
   +----+---------+
   |              |
   v              v
Run Service   Event Service
   |              |
   +------v-------+
          |
    SQLite + Drizzle
          |
    Fake Generator



Core Behaviour

The application streams generated response events over WebSocket while persisting
each event to SQLite.

Every event contains:

Event ID
Run ID
Sequence number
Event type
Payload

The client tracks the latest sequence number it has received.

When a connection is interrupted, the client reconnects using the same run ID and
cursor. The server can replay persisted events after that cursor and transition
the connection back to live delivery.

Running locally
Server
cd server
npm install
npm run db:push
npm run dev

Server:

http://localhost:4000

WebSocket:

ws://localhost:4000
Client

In another terminal:

cd client
npm install
npm run dev

Client:

http://localhost:3000
Demo scenarios

The demo covers:

Normal realtime streaming.
Disconnecting while a run is active.
Reconnecting and replaying missed events.
Generator failure after partial output.
Final run state and persisted event history.
Verification/benchmark scenario.
Design

The main design principle is that durable event history is the source of truth,
while WebSocket is the realtime delivery mechanism.

SQLite was selected because the challenge is scoped to a single-server prototype
and does not require multiple production instances or regions.

See SUBMISSION.md for the complete challenge submission,
architecture decisions, acceptance scenarios, limitations, and AI usage.
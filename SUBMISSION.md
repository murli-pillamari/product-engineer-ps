# Product Engineering Challenge Submission

## Candidate

- **Name:** Murli Pillamari
- **Email:** <YOUR_EMAIL>
- **GitHub:** <YOUR_GITHUB_URL>
- **Selected problem:** Problem 1 — Resumable Realtime Conversation
- **Demo video:** <YOUR_DEMO_VIDEO_URL>

## Run the project

### Prerequisites

- Node.js 20+
- npm

No external API keys or paid services are required.

### Install dependencies

From the project root:

```bash
cd server
npm install

cd ../client
npm install
Start the backend
cd server
npm run dev

The backend runs on:

http://localhost:4000

WebSocket endpoint:

ws://localhost:4000
Start the frontend

In another terminal:

cd client
npm run dev

The frontend runs on:

http://localhost:3000
Database

The application uses SQLite with Drizzle ORM.

The database is created locally and does not require an external database service.

If required for a fresh setup:

cd server
npm run db:push
Successful scenario
Start the backend.
Start the frontend.
Open http://localhost:3000.
Click Start Conversation.
The server generates a sequence of text events.
Events are persisted to SQLite before being delivered through WebSocket.
The client displays the streamed events in sequence.
The run eventually reaches completed.
Recovery scenario
Start a conversation.
Allow several events to arrive.
Disconnect the WebSocket/client while the run is still active.
Allow the server to continue generating events.
Reconnect the client.
The client sends the runId and its last received sequence number.
The server replays persisted events after the cursor.
The connection transitions back to live delivery.
The client receives the complete ordered event stream without logical duplicates.
Run the tests
cd server
npm test

The tests cover important success, failure, ordering, and recovery behaviour.

Acceptance scenarios and verification
AC1 — Ordered live stream

Implemented.

Each generated event contains:

Stable event ID
Run ID
Monotonically increasing sequence number
Event type
Payload

Events are persisted and delivered according to their sequence number.

AC2 — Missed-event recovery

Implemented.

The client maintains a lastSequence cursor.

When reconnecting, it sends:

{
  "type": "resume_run",
  "runId": "<run-id>",
  "lastSequence": 5
}

The server retrieves persisted events after sequence 5 and replays them before returning to live delivery.

AC3 — Replay/live overlap

Implemented.

A reconnecting client is registered with the run connection manager before replay begins.

Events generated during replay are buffered for that connection. After replay completes, buffered events are flushed in sequence order before the connection transitions to live mode.

The client also deduplicates events using their stable event IDs.

AC4 — Service restart

Implemented according to the documented interruption policy.

Run state and event history are persisted in SQLite rather than relying on in-memory state.

On service restart, an in-progress run can be identified from persisted state and handled as an interrupted run according to the implementation's restart policy.

AC5 — Generator failure after partial output

Implemented.

If the generator fails after producing some events:

Previously generated events remain persisted.
The run transitions to failed.
The error is persisted.
The run cannot subsequently transition to completed.
AC6 — Invalid/stale cursor

Implemented with explicit cursor validation.

An invalid cursor results in an explicit recoverable response rather than silently returning an apparently successful empty replay.

Verification benchmark

The verification benchmark uses a 30-event generated response.

The benchmark scenario:

Start a run.
Stream events while connected.
Interrupt the connection while the run is active.
Reconnect using the client's last sequence number.
Allow the run to finish.
Verify the final ordered event sequence.

Command/steps:

<ADD FINAL BENCHMARK COMMAND HERE>

Observed result:

Total events:
Received events:
Missing events:
Duplicate events:
Final state:
Failure/recovery scenario demonstrated in the video

The demo shows an active conversation being interrupted while events are being generated.

The client reconnects using the persisted runId and its last received sequence number. The server replays the missing events from SQLite and then resumes live delivery.

The demo also shows a generator failure after partial output and the resulting terminal failed state.

Architecture and data flow
                    ┌─────────────────────┐
                    │   Next.js / React   │
                    │       Client        │
                    └──────────┬──────────┘
                               │
                         WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Node.js + ws Server │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
       │ Run Service │  │Event Service│  │  Connection  │
       │             │  │             │  │   Manager    │
       └──────┬──────┘  └──────┬──────┘  └──────┬───────┘
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ SQLite + Drizzle ORM│
                    │                     │
                    │ conversations       │
                    │ runs                │
                    │ events              │
                    └─────────────────────┘
                               ▲
                               │
                    ┌─────────────────────┐
                    │   Fake Generator    │
                    │                     │
                    │ deterministic text  │
                    │ events + failures   │
                    └─────────────────────┘
Event flow
Fake Generator
      │
      ▼
Generate chunk
      │
      ▼
Assign sequence number + event ID
      │
      ▼
Persist event in SQLite
      │
      ▼
Publish to WebSocket
      │
      ▼
Client receives event
      │
      ▼
Update lastSequence
Reconnection flow
Client disconnects
       │
       ▼
Client retains runId + lastSequence
       │
       ▼
Client reconnects
       │
       ▼
Server subscribes connection
       │
       ▼
Read persisted events after cursor
       │
       ▼
Replay missing events
       │
       ▼
Flush events generated during replay
       │
       ▼
Switch connection to live mode
Technology choices
Next.js + React + TypeScript

The frontend uses Next.js and React because the problem requires a realtime conversational client with explicit client-side connection and run state.

TypeScript provides stronger contracts for WebSocket messages, events, and state transitions.

Node.js + WebSocket

Node.js with the ws library provides a lightweight WebSocket implementation suitable for this focused realtime challenge.

WebSocket was selected instead of polling because the problem specifically focuses on realtime streaming and reconnect/replay behaviour.

SQLite

SQLite was selected because the challenge scopes out multiple production servers and regions.

It provides durable local persistence without requiring an external database service, making the challenge easy to run and review.

For a multi-instance production deployment, a shared database would be more appropriate.

Drizzle ORM

Drizzle provides typed database access while keeping the database layer relatively lightweight.

Deterministic fake generator

A fake generator was used instead of a real LLM.

This keeps the implementation deterministic, avoids external API dependencies, and makes failure and recovery scenarios reproducible.

Important decisions
1. Persist events before delivery

Generated events are written to SQLite before being sent to the WebSocket client.

This makes the database the durable source of truth rather than the WebSocket connection.

2. Sequence numbers as the replay cursor

Each event has a monotonically increasing sequence number within a run.

The client only needs to persist its latest sequence number and can request all events after that cursor when reconnecting.

3. Replay/live handoff

A reconnecting connection enters a replaying state before querying historical events.

Events generated during replay are buffered and flushed after historical replay completes.

This avoids a gap between the historical replay and live stream.

Assumptions and limitations
The implementation targets a single server process.
Multiple simultaneous assistant runs are outside the selected problem scope.
Authentication and authorization are intentionally omitted.
The fake generator represents the model/runtime.
SQLite is used for this prototype and is not intended as the production multi-instance persistence layer.
There is no multi-region deployment.
Rich message types and attachments are outside the scope.
Cancellation is outside the scope of the selected problem.
Event retention/expiry is simplified for the challenge.
Reconnect behaviour is designed for transient connection interruptions rather than long-term offline synchronization.
Production and scale

The submitted implementation is intentionally designed for the single-process scope of the challenge.

For production scale, the first changes would be:

Move durable state to a shared production database such as PostgreSQL.
Separate realtime delivery from the application process using a shared messaging/pub-sub layer.
Add authentication and authorization around conversations and runs.
Add metrics and tracing for run duration, event latency, reconnects, replay size, and failures.
Add durable background job infrastructure for long-running generation.
Add event retention and cursor-expiry policies.
Add horizontal scaling and load balancing with connection-aware routing.

These are proposed production improvements and are not claimed as part of the submitted prototype.

AI usage

I used ChatGPT as an engineering assistant during the implementation.

It helped with:

Breaking the problem into implementation steps.
Reviewing the realtime event and reconnection architecture.
Discussing WebSocket replay and ordering strategies.
Generating initial implementation scaffolding.
Identifying edge cases around replay/live overlap and failure recovery.
Reviewing test scenarios and documentation.

I reviewed, tested, modified, and integrated the suggestions myself. I remain responsible for the submitted implementation and can explain the architecture, implementation, and trade-offs.

Credibility note
Snowkap

I previously worked on a document-processing workflow where users uploaded documents and needed visibility into the processing status and extraction progress while an AI backend processed the documents.

My contribution involved frontend development and integration of the processing workflow, including representing processing states and progress to users and integrating the application with backend services.

The workflow involved cloud infrastructure and asynchronous document processing, including S3-backed document handling and database-backed processing state.

One important engineering consideration was keeping the user interface synchronized with long-running backend processing and intermediate states rather than treating document processing as a single synchronous request.

Additional implementation details are confidential, so specific customer information and internal metrics are not included.
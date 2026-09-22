# Product Engineering Challenge Submission

## Candidate

- **Name:** Murli Pillamari
- **Email:** murlipillamari6@gmail.com
- **GitHub:** https://github.com/murli-pillamari
- **Selected problem:** Problem 1 — Resumable Realtime Conversation
- **Demo video:** https://drive.google.com/file/d/1tZUvhZE0q9D6t2RLYA3sRg5gXntmQxfQ/view?usp=sharing

## Run the project

### Prerequisites

- Node.js 20+
- npm

No external API keys are required.

### Start the server

```bash
cd server
npm install
npm run db:push
npm run dev
```

The server runs on:

```text
http://localhost:4000
```

WebSocket endpoint:

```text
ws://localhost:4000
```

### Start the client

Open another terminal:

```bash
cd client
npm install
npm run dev
```

The client runs on:

```text
http://localhost:3000
```

### Successful scenario

1. Open http://localhost:3000.
2. Start a conversation.
3. The server generates a sequence of text events.
4. Events are persisted to SQLite.
5. Events are streamed to the client over WebSocket.
6. The run reaches its terminal state after generation completes.

### Recovery scenario

1. Start a conversation.
2. Allow several events to arrive.
3. Disconnect the client while generation is still active.
4. Allow the server to continue generating events.
5. Reconnect the client.
6. The client provides the run ID and last received sequence number.
7. The server replays the missing persisted events.
8. The client continues receiving the live stream.

## Run the tests

The repository contains development verification code used while implementing the run and generator behaviour.

Final automated test coverage is intentionally focused on the core challenge behaviour rather than broad application coverage.

```bash
cd server
npm test
```

If the test command is not available in the submitted package, the core scenarios can be reproduced using the application and benchmark steps described below.

## Acceptance scenarios and verification

### AC1 — Ordered live stream

Implemented.

Each streamed event has a monotonically increasing sequence number within a run.

The client displays events according to their sequence.

### AC2 — Missed-event recovery

Implemented.

The client keeps a `lastSequence` cursor and sends it together with the run ID when reconnecting.

The server retrieves persisted events after that cursor and replays them.

### AC3 — Replay/live overlap

Implemented as part of the connection management design.

A reconnecting connection enters replay mode before historical events are retrieved. Events generated during replay can be buffered and then flushed before the connection returns to live delivery.

Stable event IDs and client-side deduplication provide an additional protection against logical duplicate events.

### AC4 — Service restart

The event and run state are persisted in SQLite, so the history does not depend only on the WebSocket connection's in-memory state.

The prototype is designed around a single-process server and does not implement distributed multi-server recovery.

### AC5 — Generator failure after partial output

Implemented.

The fake generator can be configured to fail after a number of generated events.

Previously generated events remain persisted and the run transitions to `failed`.

The demo video shows this scenario.

### AC6 — Invalid/stale cursor

Cursor validation is intentionally limited in this prototype. The primary recovery path uses the persisted run history and client sequence cursor.

A production implementation would additionally maintain explicit cursor-retention and expiry semantics and return a structured recoverable error when a cursor is no longer valid.

### Verification benchmark

The benchmark uses a 30-event generated response and exercises interruption and reconnection while the run is active.

Run/verify the benchmark using the project instructions and record the actual observed values below.

```text
Total events:
Received events:
Missing events:
Duplicate events:
Final state:
```

The demo video includes the benchmark execution and observed result.

### Failure/recovery scenario demonstrated in the video

The demo shows a realtime run being interrupted and then reconnected using the same run ID and last received sequence.

It also demonstrates a generator failure after partial output. The previously generated events remain available and the run enters the failed state.

## Architecture and data flow

```text
                    +----------------------+
                    |   Next.js / React    |
                    |       Client         |
                    +----------+-----------+
                               |
                           WebSocket
                               |
                               v
                    +----------------------+
                    | Node.js WebSocket    |
                    |       Server         |
                    +----------+-----------+
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
      +-------------+   +-------------+   +-------------+
      | Run Service |   |Event Service|   | Connection  |
      |             |   |             |   |   Manager   |
      +------+------+   +------+------+   +------+------+
             |                 |                 |
             +-----------------+-----------------+
                               |
                               v
                    +----------------------+
                    | SQLite + Drizzle ORM |
                    |                      |
                    | conversations        |
                    | runs                 |
                    | events               |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   Fake Generator      |
                    | deterministic events |
                    +----------------------+
```

### Normal event flow

```text
Generator
   |
   v
Generate chunk
   |
   v
Assign event ID + sequence
   |
   v
Persist event
   |
   v
Publish through WebSocket
   |
   v
Client updates lastSequence
```

### Recovery flow

```text
Client disconnects
       |
       v
Client keeps runId + lastSequence
       |
       v
Client reconnects
       |
       v
Server reads persisted events
       |
       v
Replay missing events
       |
       v
Transition back to live stream
```

## Technology choices

### Next.js + React + TypeScript

Used for the realtime client and explicit connection/run state management.

TypeScript provides strong typing for events and WebSocket message structures.

### Node.js + WebSocket

WebSocket was selected because the problem requires realtime event streaming rather than polling.

The `ws` library keeps the server implementation lightweight.

### SQLite + Drizzle ORM

SQLite was chosen because this challenge is scoped to a self-contained prototype and explicitly does not require multiple production servers or regions.

Drizzle provides typed database access without adding a large abstraction layer.

### Deterministic fake generator

A deterministic fake generator was used instead of a real LLM.

This avoids external API dependencies and makes successful streaming and failure scenarios reproducible.

## Important decisions

### 1. Persist before delivery

Events are persisted before being sent through WebSocket.

This makes durable history the source of truth instead of relying on a live connection to preserve data.

### 2. Sequence numbers as the cursor

Every event receives a monotonically increasing sequence number within a run.

The client can therefore recover by providing its last received sequence number.

### 3. Replay/live transition

The reconnecting connection is handled as a replaying connection before it returns to live delivery.

Events generated during the replay period can be buffered and delivered after the historical replay.

## Assumptions and limitations

- The prototype runs as a single server process.
- Authentication and authorization are outside the challenge scope.
- Multiple simultaneous assistant runs are outside the selected scope.
- Multiple production servers and regions are not implemented.
- The fake generator represents the model/runtime.
- SQLite is intended for the challenge prototype rather than a horizontally scaled production environment.
- Rich message types and attachments are outside scope.
- Cancellation is outside scope.
- Event retention and cursor expiry are simplified.
- No paid external AI service is required.

## Production and scale

For a production implementation, I would first move durable state to a shared production database such as PostgreSQL.

I would then introduce a shared messaging/pub-sub mechanism for realtime delivery across multiple application instances.

Other production improvements would include:

- Authentication and authorization
- Durable background job processing
- Event retention and cursor expiry
- Metrics and distributed tracing
- Connection/reconnect observability
- Rate limiting
- Horizontal scaling
- More comprehensive automated integration tests

These are proposed production improvements and are not claimed as part of the submitted single-server prototype.

## AI usage

I used ChatGPT as an engineering assistant during the implementation.

It helped with:

- Breaking the challenge into implementation steps.
- Discussing event ordering and WebSocket reconnection.
- Reviewing replay/live transition scenarios.
- Generating initial implementation scaffolding.
- Identifying failure and recovery edge cases.
- Reviewing documentation and test scenarios.

I reviewed and tested the generated suggestions, modified the implementation where necessary, and remain responsible for the submitted code and its design.

## Credibility note

### Snowkap

I previously worked on a document-processing workflow where users uploaded documents and needed visibility into processing status and extraction progress while an AI backend processed the documents.

My contribution involved frontend development and integration of the processing workflow, including representing processing states and progress to users and integrating the application with backend services.

The workflow involved cloud infrastructure and asynchronous document processing, including S3-backed document handling and database-backed processing state.

One important engineering consideration was keeping the UI synchronized with long-running backend processing and intermediate states rather than treating document processing as a single synchronous request.

Specific customer details and internal metrics are confidential.

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
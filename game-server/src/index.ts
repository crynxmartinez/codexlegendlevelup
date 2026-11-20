import { defineServer, defineRoom, WebSocketTransport } from 'colyseus';
import { CodexMatch } from './rooms/CodexMatch.js';
import { registerCodexGuests } from './guests.js';
const server=defineServer({transport:new WebSocketTransport({maxPayload:65536}),rooms:{codex_match:defineRoom(CodexMatch)},express:registerCodexGuests});
await server.listen(Number(process.env.PORT??2570),process.env.CODEX_HOST);

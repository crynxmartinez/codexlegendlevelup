import { expect, it, vi } from 'vitest';
import { CodexMatch } from '../src/rooms/CodexMatch.js';
import { MatchSession, parseSetup } from '../../src/pvp/session.js';
import { STARTERS } from '../../src/pvp/catalog.js';

// Actual room handlers, with only transport and timers replaced. No socket/profile needed.
for (const firstAway of [0, 1]) for (const bothAway of [false, true]) {
  it(`starts once after loading reconnect: seat ${firstAway}, both away ${bothAway}`, async () => {
    const room = new CodexMatch() as any;
    const handlers = new Map<string, Function>();
    room.setPrivate = vi.fn(); room.onMessage = (key: string, fn: Function) => handlers.set(key, fn);
    room.clock.setInterval = vi.fn(); room.clock.setTimeout = vi.fn();
    room.onCreate();
    const session = new MatchSession([parseSetup({ deck: STARTERS.Luzon }), parseSetup({ deck: STARTERS.Mindanao })], 42, () => {});
    const start = vi.spyOn(session, 'start');
    room.session = session; room.loading = true;
    room.seats = [0, 1].map(id => ({ id: String(id), loaded: false, connected: true }));
    room.sync = vi.fn(); room.lobby = vi.fn();
    const clients = [0, 1].map(id => ({ auth: { id: String(id) } }));
    handlers.get('loaded')!(clients[firstAway]);
    room.seats[firstAway].connected = false;
    if (bothAway) room.seats[1-firstAway].connected = false;
    handlers.get('loaded')!(clients[1-firstAway]);
    expect(start).not.toHaveBeenCalled();
    room.onReconnect(clients[firstAway]);
    if (bothAway) { expect(start).not.toHaveBeenCalled(); room.onReconnect(clients[1-firstAway]); }
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(start).toHaveBeenCalledTimes(1);
    expect(room.loading).toBe(false);
    const state = JSON.stringify(session.game);
    for (const client of clients) { handlers.get('loaded')!(client); room.onReconnect(client); handlers.get('sync')!(client); }
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(start).toHaveBeenCalledTimes(1); expect(JSON.stringify(session.game)).toBe(state);
    session.close();
  });
}

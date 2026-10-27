import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { originAllowed } from "./cors.js";
import type { Hub } from "./engine.js";

type LiveSocket = WebSocket & { alive?: boolean; misses?: number };

const PING_MS = 25_000;

export function attachWs(server: Server, onConnect?: () => unknown[]): Hub & { close: () => void } {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    verifyClient: (info, done) => {
      const origin = info.origin || header(info.req.headers.origin) || undefined;
      const host = header(info.req.headers.host);
      if (originAllowed(origin, host)) done(true);
      else done(false, 403, "Forbidden");
    },
  });
  const sockets = new Set<LiveSocket>();
  wss.on("connection", (socket: LiveSocket) => {
    sockets.add(socket);
    socket.alive = true;
    socket.misses = 0;
    socket.on("pong", () => {
      socket.alive = true;
    });
    socket.on("close", () => sockets.delete(socket));
    socket.send(JSON.stringify({ type: "hello" }));
    for (const message of onConnect?.() ?? []) {
      socket.send(JSON.stringify(message));
    }
  });
  const pulse = setInterval(() => {
    for (const socket of sockets) {
      if (socket.alive) socket.misses = 0;
      else socket.misses = (socket.misses ?? 0) + 1;
      if ((socket.misses ?? 0) >= 2) {
        socket.terminate();
        sockets.delete(socket);
        continue;
      }
      socket.alive = false;
      socket.ping();
    }
  }, PING_MS);
  pulse.unref();
  return {
    broadcast(message: unknown) {
      const raw = JSON.stringify(message);
      for (const socket of sockets) {
        if (socket.readyState === socket.OPEN) socket.send(raw);
      }
    },
    close() {
      clearInterval(pulse);
      for (const socket of sockets) socket.close();
      sockets.clear();
      wss.close();
    },
  };
}

function header(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

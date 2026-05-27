// Server-Sent Events stream of stats.
// Subscribes to Postgres LISTEN doc_change; recomputes v_stats on every notify
// and also heartbeats every 25 s so clients know the channel is alive.

import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let closed = false;
      const client = await pool.connect();

      const emitStats = async () => {
        if (closed) return;
        try {
          const { rows } = await client.query("SELECT * FROM v_stats");
          send("stats", rows[0] ?? {});
        } catch (e) {
          send("error", { message: String(e) });
        }
      };

      // Initial snapshot
      await emitStats();

      // Heartbeat (keep connection alive through proxies)
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
      }, 25_000);

      // Listen for document changes
      client.on("notification", () => {
        emitStats();
      });

      try {
        await client.query("LISTEN doc_change");
      } catch (e) {
        send("error", { message: `LISTEN failed: ${String(e)}` });
      }

      // Cleanup on disconnect
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try {
          client.query("UNLISTEN doc_change").catch(() => undefined);
        } finally {
          client.release();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      };

      // @ts-expect-error - signal exposed by ReadableStream in Node 18+
      controller.signal?.addEventListener?.("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}

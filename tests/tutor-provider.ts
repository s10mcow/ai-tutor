import { createServer } from "node:http";

// A controlled external service. Auth, application routes and PostgreSQL stay real.
export async function controlledTutor() {
  const responses: Array<{
    text?: string;
    status: number;
    wait?: Promise<void>;
  }> = [];
  const requests: Array<{
    sessionId: string;
    problem: string;
    actions: Array<{ intent: string; text: string; reply: string | null }>;
  }> = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push(JSON.parse(body));
    const next = responses.shift() ?? { status: 503 };
    await next.wait;
    response.writeHead(next.status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ text: next.text }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No provider port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    reply(text: string) {
      responses.push({ text, status: 200 });
    },
    fail() {
      responses.push({ status: 503 });
    },
    hold(text: string) {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      responses.push({ text, status: 200, wait });
      return release;
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

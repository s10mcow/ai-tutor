import { createServer } from "node:http";

// Only the external HTTP provider is controlled. All app/auth/allowance SQL is real.
export async function controlledOpenAI() {
  const requests: Array<{
    path: string;
    body: any;
    headers: Record<string, string | string[] | undefined>;
  }> = [];
  const responses: Array<{
    status: number;
    body?: unknown;
    disconnect?: boolean;
    wait?: Promise<void>;
  }> = [];
  function body(
    text: string,
    usage: unknown = {
      input_tokens: 10000,
      output_tokens: 300,
      input_tokens_details: {
        cached_tokens: 0,
        cache_write_tokens: 0,
        cache_write_tokens_details: { ttl_30m_tokens: 0, ttl_12h_tokens: 0 },
      },
      output_tokens_details: { reasoning_tokens: 200 },
    },
  ) {
    return {
      id: "resp_fixture",
      model: "gpt-6.1-sol",
      status: "completed",
      service_tier: "default",
      output: [{ type: "message", content: [{ type: "output_text", text }] }],
      usage,
    };
  }
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    let parsed: unknown;
    if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
      const form = await new Response(bytes, {
        headers: { "Content-Type": req.headers["content-type"] },
      }).formData();
      const file = form.get("file") as File;
      parsed = {
        model: form.get("model"),
        response_format: form.get("response_format"),
        fileName: file.name,
        fileType: file.type,
        fileBytes: file.size,
      };
    } else parsed = JSON.parse(bytes.toString());
    requests.push({
      path: req.url!,
      body: parsed,
      headers: req.headers,
    });
    const next = responses.shift() ?? { status: 503 };
    await next.wait;
    if (next.disconnect) {
      req.socket.destroy();
      return;
    }
    res.writeHead(next.status, {
      "Content-Type": "application/json",
      "x-request-id": "req_fixture",
    });
    res.end(
      JSON.stringify(next.body ?? { error: { code: "provider_failure" } }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  return {
    url: `http://127.0.0.1:${address.port}/v1/responses`,
    requests,
    reply(text: string, usage?: unknown) {
      responses.push({ status: 200, body: body(text, usage) });
    },
    transcribe(
      text: string,
      usage: unknown = { type: "duration", seconds: 1 },
    ) {
      responses.push({ status: 200, body: { text, usage } });
    },
    holdTranscription(text: string) {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      responses.push({
        status: 200,
        body: { text, usage: { type: "duration", seconds: 1 } },
        wait,
      });
      return release;
    },
    incomplete() {
      responses.push({
        status: 200,
        body: { ...body("An unfinished thought"), status: "incomplete" },
      });
    },
    fail(status = 503, code = "provider_failure") {
      responses.push({ status, body: { error: { code } } });
    },
    disconnect() {
      responses.push({ status: 200, disconnect: true });
    },
    hold(text: string) {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      responses.push({ status: 200, body: body(text), wait });
      return release;
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

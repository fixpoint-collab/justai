import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";

const system = `You are a read-only file analysis assistant. Your job is to read files and answer questions about them.

Rules:
- You may ONLY read files — never write, edit, or create any files.
- The user will specify which files to look at in their messages.`;

const model = claudeCode("sonnet", {
  allowedTools: ["Read", "Glob", "Grep"],
});

const app = new Hono();

app.post("/chat", async (c) => {
  try {
    const { message } = await c.req.json<{ message: string }>();
    if (!message?.trim()) {
      return c.json({ error: "message is required" }, 400);
    }

    const { text } = await generateText({
      model,
      system,
      prompt: message,
    });

    return c.json({ response: text });
  } catch (err) {
    console.error("POST /chat error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

app.get("/health", (c) => c.json({ status: "ok" }));

const port = parseInt(process.env.PORT || "8080", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Container agent listening on port ${info.port}`);
});

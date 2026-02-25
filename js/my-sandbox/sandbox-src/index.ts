import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";
import { query } from "@anthropic-ai/claude-agent-sdk";

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

app.post("/claude-chat", async (c) => {
  try {
    const { message } = await c.req.json<{ message: string }>();
    if (!message?.trim()) {
      return c.json({ error: "message is required" }, 400);
    }

    const conversation = query({
      prompt: message,
      options: {
        model: "claude-sonnet-4-6",
        systemPrompt: system,
        allowedTools: ["Read", "Glob", "Grep"],
        permissionMode: "default",
      },
    });

    // Iterate the async generator to find the final result message
    let resultText = "";
    for await (const msg of conversation) {
      console.log(`new message: ${msg.uuid} [${msg.type}]`);
      if (msg.type === "result") {
        if (msg.subtype === "success") {
          resultText = msg.result;
        } else {
          return c.json({ error: msg.errors.join(", ") }, 500);
        }
      }
    }

    return c.json({ response: resultText });
  } catch (err) {
    console.error("POST /claude-chat error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

app.get("/ping", (c) => c.json({ msg: "pong" }));

app.get("/health", (c) => c.json({ status: "ok" }));

const port = parseInt(process.env.PORT || "8080", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Container agent listening on port ${info.port}`);
});

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";
import { query } from "@anthropic-ai/claude-agent-sdk";

const system = `You are a read-only file analysis assistant. Your job is to read files and answer questions about them.

Rules:
- You may ONLY read files — never write, edit, or create any files.
- The user will specify which files to look at in their messages.`;

const app = new Hono();

app.post("/chat", async (c) => {
  try {
    const { message, sessionId } = await c.req.json<{
      message: string;
      sessionId?: string;
    }>();
    if (!message?.trim()) {
      return c.json({ error: "message is required" }, 400);
    }

    const model = claudeCode("sonnet", {
      allowedTools: ["Read", "Glob", "Grep"],
      ...(sessionId && { sdkOptions: { resume: sessionId } }),
    });

    const result = await generateText({
      model,
      system,
      prompt: message,
    });

    // Try to extract session ID from provider metadata
    const resultSessionId =
      (result.providerMetadata?.claudeCode as Record<string, unknown>)
        ?.sessionId ??
      (result.providerMetadata?.claude_code as Record<string, unknown>)
        ?.sessionId;

    return c.json({
      response: result.text,
      ...(resultSessionId && { sessionId: resultSessionId }),
    });
  } catch (err) {
    console.error("POST /chat error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

app.post("/claude-chat", async (c) => {
  const { message, sessionId } = await c.req.json<{
    message: string;
    sessionId?: string;
  }>();
  if (!message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const conversation = query({
      prompt: message,
      options: {
        model: "claude-sonnet-4-6",
        systemPrompt: system,
        allowedTools: ["Read", "Glob", "Grep"],
        permissionMode: "default",
        ...(sessionId && { resume: sessionId }),
      },
    });

    // Abort the conversation if the client disconnects
    stream.onAbort(() => {
      conversation.close();
    });

    for await (const msg of conversation) {
      if (msg.type === "system" && msg.subtype === "init") {
        await stream.writeSSE({
          event: "init",
          data: JSON.stringify({ sessionId: msg.session_id }),
        });
      } else if (msg.type === "assistant") {
        await stream.writeSSE({
          event: "assistant",
          data: JSON.stringify(msg),
        });
      } else if (msg.type === "result") {
        if (msg.subtype === "success") {
          await stream.writeSSE({
            event: "result",
            data: JSON.stringify({ result: msg.result }),
          });
        } else {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({
              error: msg.errors?.join(", ") ?? "Unknown error",
            }),
          });
        }
      } else {
        // Forward all other message types as-is for observability
        await stream.writeSSE({
          event: msg.type,
          data: JSON.stringify(msg),
        });
      }
    }
  });
});

app.get("/ping", (c) => c.json({ msg: "pong" }));

app.get("/health", (c) => c.json({ status: "ok" }));

const port = parseInt(process.env.PORT || "8080", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Container agent listening on port ${info.port}`);
});

import { generateText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";
import { createInterface } from "node:readline/promises";

const system = `You are a read-only file analysis assistant. Your job is to read files and answer questions about them.

Rules:
- You may ONLY read files — never write, edit, or create any files.
- The user will specify which files to look at in their messages.`;

const model = claudeCode("sonnet", {
  allowedTools: ["Read", "Glob", "Grep"],
});

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log("File analysis assistant. Type your questions below (/exit or Ctrl+D to exit).\n");

for (;;) {
  const question = await rl.question("> ");
  const trimmed = question.trim();
  if (trimmed === "/exit") {
    rl.close();
    break;
  }
  if (!trimmed) continue;

  const { text } = await generateText({
    model,
    system,
    prompt: question,
  });

  console.log(`\n${text}\n`);
}

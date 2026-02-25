import { getSandbox } from '@cloudflare/sandbox';

export { Sandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get or create a sandbox instance
    const sandbox = getSandbox(env.Sandbox, 'my-sandbox');
    sandbox.setEnvVars({
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    })

    // Execute a shell command
    if (url.pathname === '/run') {
      const result = await sandbox.exec('echo "2 + 2 = $((2 + 2))"');
      return Response.json({
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        success: result.success
      });
    }

    // Forward chat requests to the container's chat endpoint
    if (url.pathname === '/chat' && request.method === 'POST') {
      const body = await request.json();
      const response = await sandbox.containerFetch(
        new URL('chat', request.url).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        8080,
      );
      return response;
    }

    // Forward claude-chat requests to the container's claude-chat endpoint
    if (url.pathname === '/claude-chat' && request.method === 'POST') {
      const body = await request.json();
      const response = await sandbox.containerFetch(
        'http://localhost/claude-chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        8080,
      );
      return response;
    }

    if (url.pathname === "/ping") {
      const response = await sandbox.containerFetch(
        new URL('ping', request.url).toString(),
        {
          method: 'GET',
        },
        8080,
      );
      return response;
    }

    // Work with files
    if (url.pathname === '/file') {
      await sandbox.writeFile('/workspace/hello.txt', 'Hello, Sandbox!');
      const file = await sandbox.readFile('/workspace/hello.txt');
      return Response.json({
        content: file.content
      });
    }

    return new Response('Try /run, /file, POST /chat, or POST /claude-chat');
  }
};

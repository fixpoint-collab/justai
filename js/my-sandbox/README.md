# Minimal Sandbox SDK Example

A minimal Cloudflare Worker that demonstrates Claude Agent interaction.

## How It Works

This example provides a chat endpoint:

1. **`POST /chat`** - Creates a file, reads it back, and returns the contents

## API Endpoints

### Execute Python Code

Sends a message to Claude Agent.

```bash
curl --location 'http://localhost:8787/chat' \
--header 'Content-Type: application/json' \
--data '{
    "message": "What is in index.ts?"
}'
```

## Setup

1. From the project root, run:

```bash
npm install
npm run build
```

2. Run locally:

```bash
# add a .env file with ANTHROPIC_API_KEY set
npm run dev
```

The first run will build the Docker container (2-3 minutes). Subsequent runs are much faster.

## Testing

```bash
curl --location 'http://localhost:8787/chat' \
--header 'Content-Type: application/json' \
--data '{
    "message": "What is in index.ts?"
}'
```

## Deploy

```bash
npm run deploy
```

After first deployment, wait 2-3 minutes for container provisioning before making requests.

## Next Steps

This minimal example is the starting point for more complex applications. See the [Sandbox SDK documentation](https://developers.cloudflare.com/sandbox/) for:

- Advanced command execution and streaming
- Background processes
- Preview URLs for exposed services
- Custom Docker images

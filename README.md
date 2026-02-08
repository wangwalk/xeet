# xeet — X (Twitter) in your terminal.

Fast, agent-friendly CLI for the X platform. JSON-first output, OAuth 2.0 PKCE auth, minimal dependencies.

## Features

- **Post** — create, reply, quote, thread, delete
- **Read** — get any post by ID with full metadata
- **Timeline** — home feed or any user's posts
- **Search** — recent posts with sort control
- **Interact** — like, repost, bookmark (OAuth 2.0 exclusive)
- **Users** — profile lookup, followers, following
- **Mentions** — posts mentioning the authenticated user
- **Dual auth** — OAuth 2.0 PKCE (recommended) with OAuth 1.0a fallback
- **Auto token refresh** — authenticate once, use indefinitely
- **Agent-first** — structured JSON on stdout, errors on stderr, meaningful exit codes

## Installation

```bash
npm install -g xeet
```

Or run directly without installing:

```bash
npx xeet --help
```

### From source

```bash
git clone https://github.com/wangwalk/xeet.git
cd xeet
npm install
npm run build
npm link
```

## Quick Start

### 1. Get OAuth 2.0 Credentials

1. Go to [X Developer Portal](https://developer.x.com)
2. Create or open your App
3. In **User authentication settings**, enable **OAuth 2.0**
4. Type: **Native App** (public client, no secret needed)
5. Callback URL: `http://127.0.0.1:8477/callback`
6. Copy your **Client ID**

### 2. Authenticate

```bash
xeet auth login --client-id <your-client-id>
```

This opens a browser for authorization. After approving, tokens are saved to `~/.config/xeet/credentials.json`.

### 3. Verify

```bash
xeet auth status
```

### 4. Use

```bash
xeet post "Hello from xeet"
xeet user @XDevelopers
xeet bookmark <tweet-id>
```

## Authentication

### OAuth 2.0 PKCE (recommended)

```bash
xeet auth login --client-id <id> [--client-secret <secret>] [--port 8477]
```

Tokens auto-refresh via `offline.access` scope. Supports all endpoints including OAuth 2.0 exclusive features like Bookmarks.

### OAuth 1.0a (legacy)

```bash
xeet auth setup
```

Interactive prompt for API Key, API Secret, Access Token, and Access Token Secret.

### Environment Variables

For CI/agent environments, set credentials via env vars:

```bash
# OAuth 2.0
export XEET_ACCESS_TOKEN=<token>
export XEET_REFRESH_TOKEN=<refresh-token>    # optional
export XEET_CLIENT_ID=<client-id>            # optional

# OAuth 1.0a (all four required)
export XEET_API_KEY=<key>
export XEET_API_SECRET=<secret>
export XEET_ACCESS_TOKEN=<token>
export XEET_ACCESS_TOKEN_SECRET=<token-secret>
```

Detection priority: OAuth 1.0a (all four keys present) > OAuth 2.0 (access token only) > config file.

### Auth Status

```bash
xeet auth status
```

Shows auth type, credential source, user info, and for OAuth 2.0: token expiry and granted scopes.

## Commands

### Posts

```bash
xeet post "Hello world"                  # Create a post
xeet post "Check this out" --media a.jpg # Post with image
xeet reply <id> "Nice post!"             # Reply to a post
xeet reply <id> "Look" --media b.png     # Reply with image
xeet quote <id> "Check this out"         # Quote a post
xeet quote <id> "Wow" --media c.gif      # Quote with image
xeet thread "First" "Second" "Third"     # Post a thread
xeet delete <id>                         # Delete a post
xeet read <id>                           # Get a post by ID
```

`--media` supports jpg, png, gif, webp (max 5MB). Requires OAuth 2.0 with `media.write` scope.

### Timeline

```bash
xeet timeline                            # Home timeline
xeet timeline @username                  # User's posts
xeet timeline --limit 50                 # Control result count
xeet timeline --since 2h                 # Filter by time (2h, 30m, 1d, ISO date)
```

### Search

```bash
xeet search "query"                      # Search recent posts
xeet search "from:user" --limit 10       # With limit
xeet search "query" --sort relevancy     # Sort by relevancy (default: recency)
```

### Interactions

```bash
xeet like <id>                           # Like a post
xeet repost <id>                         # Repost (retweet)
xeet bookmark <id>                       # Bookmark (OAuth 2.0 only)
```

### Users

```bash
xeet user @username                      # Get user profile
xeet followers @username --limit 50      # Get followers
xeet following @username --limit 50      # Get following
```

### Mentions

```bash
xeet mentions                            # Recent mentions
xeet mentions --limit 10 --since 1d     # With filters
```

## Output Format

All output is structured JSON on stdout. Errors go to stderr.

### Success

```json
{
  "ok": true,
  "data": {
    "id": "123456",
    "text": "Hello world"
  }
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_MISSING",
    "message": "No credentials found."
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Auth error |
| 3 | Rate limited |
| 4 | Invalid arguments |

### Pretty Print

```bash
xeet --pretty user @XDevelopers          # Human-friendly indented JSON
```

### Piping

```bash
xeet timeline @user --limit 10 | jq '.data.posts[].text'
```

## Development

```bash
git clone https://github.com/wangwalk/xeet.git
cd xeet
npm install

npm run build          # Build with tsup
npm run typecheck      # Type check without emitting
npm run dev            # Watch mode
```

### Stack

- **TypeScript** + **tsup** (ESM, Node 18+)
- **Commander.js** for CLI parsing
- **@xdevplatform/xdk** for X API client
- Minimal runtime dependencies (just the above two)

## License

MIT

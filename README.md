# TJUEcard Server (Refactored)

This is the refactored Server-Agent architecture for TJUEcard electricity monitoring.

## Project Structure

- **`server/`**: Cloudflare Worker backend + D1 Database. Handles API and data storage.
- **`web/`**: Vue 3 Frontend. User interface for managing rooms.
- **`agent/`**: Python Agent. Runs on campus network to perform queries.

## Getting Started

Please refer to the [Walkthrough](./walkthrough.md) (in `.gemini/antigravity/brain/...`) or the documentation within each subfolder for setup instructions.

### Quick Start

1. **Server**: `cd server && npm install && npm run dev`
2. **Web**: `cd web && npm install && npm run dev`
3. **Agent**: `cd agent && pip install -r requirements.txt && python main.py`

## License

See [LICENSE](./LICENSE).

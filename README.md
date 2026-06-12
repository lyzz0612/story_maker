# Story Maker

Story Maker is a local creator for AI interactive picture books. This version focuses on the complete creation workflow end to end.

## Getting Started

```bash
pnpm install
pnpm dev
```

The root `dev` script starts both services:

- Web app: http://localhost:5174
- API: http://localhost:3001/api

## Workspace

```text
apps/web              React + Vite creator UI
apps/server           Fastify REST API
packages/scene-schema Shared TypeScript contracts
```

## Workflow

1. Open Settings to review or edit LLM providers, image providers, and art styles.
2. Open Characters to manage reusable family characters and generate reference images.
3. Create a project from a brief, selected cast members, art style, LLM, and image model.
4. Use the project workbench to review the generated outline and chat with the outline assistant.
5. Edit page text and image prompts, generate illustrations, and inspect scene data.
6. Mark asset regions on the page sheet and save asset metadata.
7. Open Preview to flip pages and test the tap-triggered interaction demo.

API keys are stored in the server-side in-memory store for the current session.

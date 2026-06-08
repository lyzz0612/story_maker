# Story Maker

Story Maker is a local mock creator for AI interactive picture books. This first version focuses on the complete creation workflow without calling real LLM or image-generation services.

## Getting Started

```bash
pnpm install
pnpm dev
```

The root `dev` script starts both services:

- Web app: http://localhost:5173
- Mock API: http://localhost:3000/api

## Workspace

```text
apps/web              React + Vite creator UI
apps/server           Fastify mock REST API
packages/scene-schema Shared TypeScript contracts
```

## Mock Workflow

1. Open Settings to review or edit LLM providers, image providers, and art styles.
2. Open Characters to manage reusable family characters and generate mock reference images.
3. Create a project from a brief, selected cast members, art style, LLM, and image model.
4. Use the project workbench to review the generated outline and send mock chat edits.
5. Edit page text, trigger mock image generation, and inspect the generated scene data.
6. Mark asset regions on the page sheet and save the mock asset metadata.
7. Open Preview to flip pages and test the tap-triggered interaction demo.

All AI behavior is deterministic mock logic. API keys are stored only in the in-memory mock store and are never sent to external providers.

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./ProjectsPage";

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

describe("ProjectsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads projects and displays page count, style, and update time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/projects")) {
          return jsonResponse([
            {
              id: "project_three_pigs",
              title: "三只小猪和宝宝的新房子",
              brief: "三只小猪一起盖房子",
              artStyleId: "style_warm_watercolor",
              llmId: "llm_story_mock",
              imageId: "image_picture_book_mock",
              castCharacterIds: ["char_baby", "char_dad"],
              pageCount: 8,
              createdAt: "2026-06-08T13:00:00.000Z",
              updatedAt: "2026-06-08T13:00:00.000Z"
            }
          ]);
        }
        if (url.endsWith("/api/art-styles")) {
          return jsonResponse([
            {
              id: "style_warm_watercolor",
              name: "温暖水彩",
              description: "柔和边缘",
              promptSuffix: "warm watercolor",
              createdAt: "2026-06-08T13:00:00.000Z",
              updatedAt: "2026-06-08T13:00:00.000Z"
            }
          ]);
        }
        return jsonResponse([]);
      })
    );

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("三只小猪和宝宝的新房子")).toBeInTheDocument();
    expect(screen.getByText("8 页", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2 角色", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("温暖水彩")).toBeInTheDocument();
  });
});

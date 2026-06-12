import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  it("renders primary navigation and nested content", () => {
    render(
      <MemoryRouter initialEntries={["/characters"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/characters" element={<div>角色库内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "AI 互动绘本制作工坊" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /项目/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /角色库/ })).toHaveAttribute("href", "/characters");
    expect(screen.getByRole("link", { name: /设置/ })).toHaveAttribute("href", "/settings");
    expect(screen.getByText("角色库内容")).toBeInTheDocument();
  });
});

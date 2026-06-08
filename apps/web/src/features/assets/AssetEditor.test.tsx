import { describe, expect, it } from "vitest";
import { buildMockExportMap } from "./AssetEditor";
import { DEFAULT_MOCK_ASSET_SHEET } from "./mockAssets";

describe("buildMockExportMap", () => {
  it("maps regions to stable logical filenames", () => {
    const exports = buildMockExportMap(DEFAULT_MOCK_ASSET_SHEET, 2);

    expect(exports["region-background-house"]).toBe("pages/page-002/background-001.svg");
    expect(exports["region-hammer-0"]).toBe("pages/page-002/sequences/hammer/frame-000.svg");
    expect(exports["region-hammer-3"]).toBe("pages/page-002/sequences/hammer/frame-003.svg");
    expect(exports["region-preview-guide"]).toBe("pages/page-002/reference/region-preview-guide.svg");
  });
});

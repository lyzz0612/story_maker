import type { FastifyPluginAsync } from "fastify";
import { applyMockChat, createProjectFromBrief, mockGeneratePage } from "../mock.js";
import { HttpError, listValues, now, requireItem, store } from "../store.js";
import type { AssetSheet, OutlinePage, Project } from "../types.js";

type IdParams = { id: string };
type PageParams = { id: string; n: string };
type CreateProjectBody = {
  title?: string;
  brief?: string;
  castCharacterIds?: string[];
  artStyleId?: string;
  llmId?: string;
  imageId?: string;
  pageCount?: number;
};
type ProjectPatchBody = Partial<Pick<Project, "title" | "brief" | "artStyleId" | "llmId" | "imageId" | "castCharacterIds">>;
type OutlinePatchBody = OutlinePage[] | { outline?: Partial<OutlinePage>[]; pages?: Partial<OutlinePage>[] };
type PagePatchBody = Partial<Omit<OutlinePage, "pageNumber">>;
type ChatBody = { message?: string };

const parsePageNumber = (value: string, project: Project) => {
  const pageNumber = Number(value);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > project.outline.length) {
    throw new HttpError(404, "Page not found");
  }
  return pageNumber;
};

const getPage = (project: Project, pageNumber: number) => {
  const page = project.outline.find((item) => item.pageNumber === pageNumber);
  if (!page) {
    throw new HttpError(404, "Page not found");
  }
  return page;
};

const getOutlinePatchItems = (body: OutlinePatchBody | undefined) => {
  if (Array.isArray(body)) {
    return body;
  }
  const items = body?.outline ?? body?.pages;
  if (!items) {
    throw new HttpError(400, "outline or pages array is required");
  }
  return items;
};

const makeProjectSummary = (project: Project) => ({
  id: project.id,
  title: project.title,
  brief: project.brief,
  artStyleId: project.artStyleId,
  llmId: project.llmId,
  imageId: project.imageId,
  castCharacterIds: project.castCharacterIds,
  pageCount: project.outline.length,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt
});

const buildExports = (assetSheet: AssetSheet) =>
  assetSheet.regions.reduce<Record<string, string>>((exports, region) => {
    exports[region.id] = `${region.role}/${region.sequenceId ?? "region"}-${region.frameIndex ?? 0}.png`;
    return exports;
  }, {});

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/projects", async () => listValues(store.projects).map(makeProjectSummary));

  fastify.post<{ Body: CreateProjectBody }>("/projects", async (request, reply) => {
    const brief = request.body?.brief?.trim();
    if (!brief) {
      throw new HttpError(400, "Project brief is required");
    }

    const project = createProjectFromBrief({
      title: request.body.title,
      brief,
      castCharacterIds: request.body.castCharacterIds ?? [],
      artStyleId: request.body.artStyleId,
      llmId: request.body.llmId,
      imageId: request.body.imageId,
      pageCount: request.body.pageCount
    });
    store.projects.set(project.id, project);
    reply.code(201);
    return project;
  });

  fastify.get<{ Params: IdParams }>("/projects/:id", async (request) =>
    requireItem(store.projects, request.params.id, "Project")
  );

  fastify.patch<{ Params: IdParams; Body: ProjectPatchBody }>("/projects/:id", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const next: Project = {
      ...project,
      ...request.body,
      title: request.body.title?.trim() || project.title,
      brief: request.body.brief?.trim() || project.brief,
      castCharacterIds: request.body.castCharacterIds ?? project.castCharacterIds,
      updatedAt: now()
    };
    store.projects.set(project.id, next);
    return next;
  });

  fastify.get<{ Params: IdParams }>("/projects/:id/outline", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    return project.outline;
  });

  fastify.patch<{ Params: IdParams; Body: OutlinePatchBody }>("/projects/:id/outline", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const items = getOutlinePatchItems(request.body);
    const timestamp = now();

    for (const patch of items) {
      if (!patch.pageNumber) {
        throw new HttpError(400, "Every outline patch item needs pageNumber");
      }
      const page = getPage(project, patch.pageNumber);
      Object.assign(page, patch, { pageNumber: page.pageNumber, updatedAt: timestamp });
    }

    project.updatedAt = timestamp;
    return project.outline;
  });

  fastify.post<{ Params: IdParams; Body: ChatBody }>("/projects/:id/chat", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const message = request.body?.message?.trim();
    if (!message) {
      throw new HttpError(400, "message is required");
    }
    return applyMockChat(project, message);
  });

  fastify.get<{ Params: PageParams }>("/projects/:id/pages/:n", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    return getPage(project, parsePageNumber(request.params.n, project));
  });

  fastify.patch<{ Params: PageParams; Body: PagePatchBody }>("/projects/:id/pages/:n", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const page = getPage(project, parsePageNumber(request.params.n, project));
    const timestamp = now();
    Object.assign(page, request.body, { pageNumber: page.pageNumber, updatedAt: timestamp });
    project.updatedAt = timestamp;
    return page;
  });

  fastify.post<{ Params: PageParams }>("/projects/:id/pages/:n/mock-generate", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const pageNumber = parsePageNumber(request.params.n, project);
    const page = getPage(project, pageNumber);
    page.status = "generating";
    const generated = mockGeneratePage(project, pageNumber);
    if (!generated) {
      throw new HttpError(404, "Page not found");
    }
    return generated;
  });

  fastify.get<{ Params: PageParams }>("/projects/:id/pages/:n/asset-sheet", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const page = getPage(project, parsePageNumber(request.params.n, project));
    return page.assetSheet;
  });

  fastify.patch<{ Params: PageParams; Body: Partial<AssetSheet> }>("/projects/:id/pages/:n/asset-sheet", async (request) => {
    const project = requireItem(store.projects, request.params.id, "Project");
    const page = getPage(project, parsePageNumber(request.params.n, project));
    const nextAssetSheet: AssetSheet = {
      ...page.assetSheet,
      ...request.body,
      sourceUrl: request.body.sourceUrl ?? page.assetSheet.sourceUrl,
      regions: request.body.regions ?? page.assetSheet.regions,
      sequences: request.body.sequences ?? page.assetSheet.sequences
    };
    nextAssetSheet.exports = buildExports(nextAssetSheet);
    page.assetSheet = nextAssetSheet;
    page.updatedAt = now();
    project.updatedAt = page.updatedAt;
    return page.assetSheet;
  });
};

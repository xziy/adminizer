import { ApiTokenManager } from "../../lib/public-api/ApiTokenManager";
import { FeedGenerator } from "../../lib/public-api/FeedGenerator";
import type { FilterAP } from "../../models/FilterAP";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const FEED_LIMIT = 100;

// Normalize API format values for public feed endpoints.
const resolveFormat = (value: string): "json" | "atom" | "rss" | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "json") {
    return "json";
  }
  if (normalized === "atom") {
    return "atom";
  }
  if (normalized === "rss" || normalized === "xml") {
    return "rss";
  }
  return null;
};

// Build the base origin for constructing feed URLs.
const buildOrigin = (req: ReqType): string => {
  const protocol = req.protocol ?? "http";
  const host = req.get("host") ?? "localhost";
  return `${protocol}://${host}`;
};

// Build links back to the admin record view.
const buildAdminRecordUrl = (req: ReqType, modelName: string, id: string | number): string => {
  const base = buildOrigin(req);
  const prefix = req.adminizer.config.routePrefix;
  return `${base}${prefix}/model/${modelName}/view/${id}`;
};

// Safely stringify feed content without throwing.
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

// Resolve a display title from common record fields.
const resolveItemTitle = (record: Record<string, unknown>): string => {
  const candidates = ["title", "name", "label"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return String(record.id ?? "Item");
};

// Resolve filters by id, slug, or API token.
const resolveFilter = async (
  req: ReqType,
  identifier: string
): Promise<Partial<FilterAP> | null> => {
  const repository = req.adminizer.filters.repository;
  if (!identifier) {
    return null;
  }

  const byId = await repository.findByIdAsAdmin(identifier);
  if (byId) {
    return byId;
  }

  const bySlug = await repository.findBySlugAsAdmin(identifier);
  if (bySlug) {
    return bySlug;
  }

  return repository.findByApiKey(identifier);
};

export default async function publicApiData(req: ReqType, res: ResType) {
  try {
    // Validate the requested response format.
    const rawFormat = String(req.params.format ?? "");
    const format = resolveFormat(rawFormat);
    if (!format) {
      return res.status(400).json({
        success: false,
        error: "Unsupported format. Use json, atom, or rss."
      });
    }

    // Read and validate the API token.
    const filterService = req.adminizer.filters.service;
    const token = filterService.getQueryStringValue(req.query.token);
    if (!token) {
      return res.status(401).json({ success: false, error: "Token is required" });
    }

    const tokenManager = new ApiTokenManager(req.adminizer);
    const user = await tokenManager.validateToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    // Enforce permissions for public API access and export.
    if (!req.adminizer.accessRightsHelper.hasPermission("api-public-access", user)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const exportToken = format === "json" ? "export-json" : "export-feed";
    if (!req.adminizer.accessRightsHelper.hasPermission(exportToken, user)) {
      return res.status(403).json({ success: false, error: "Export permission denied" });
    }

    // Load the requested filter by id/slug/token and validate it.
    const filterId = String(req.params.filterId ?? "").trim();
    const filter = await resolveFilter(req, filterId);
    if (!filter) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    if (!filter.apiEnabled) {
      return res.status(403).json({ success: false, error: "Filter is not public" });
    }

    const filterModule = req.adminizer.filters;
    filterModule.access.assertCanExecute(filter, user);

    const validation = filterModule.migration.validate(filter);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: "Filter is invalid", validation });
    }

    // Ensure the model supports filters and normalize pagination/sorting.
    const modelName = String(filter.modelName ?? "");
    if (!modelName || !filterModule.config.isFiltersEnabledForModel(modelName)) {
      return res.status(403).json({ success: false, error: "Filters are disabled for this model" });
    }

    const page = filterService.normalizePositiveInt(req.query.page, 1);
    const limitBase = filterService.normalizePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const limit = format === "json" ? limitBase : Math.min(limitBase, FEED_LIMIT);
    const sort = filterService.getQueryStringValue(req.query.sort);
    const sortDirection = filterService.normalizeSortDirection(
      filterService.getQueryStringValue(req.query.direction ?? req.query.sortDirection)
    );
    const globalSearch = filterService.getQueryStringValue(req.query.globalSearch);

    const result = await filterModule.execution.executeFilter(filter, user, {
      page,
      limit,
      sort,
      sortDirection,
      globalSearch
    });

    // Return JSON responses when requested by clients.
    if (format === "json") {
      return res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          filtered: result.filtered,
          page,
          limit,
          pages: result.pages,
          filter: {
            id: filter.id,
            name: filter.name,
            slug: filter.slug
          }
        }
      });
    }

    // Build feed items for Atom/RSS responses.
    const feedGenerator = new FeedGenerator();
    const feedLink = `${buildOrigin(req)}${req.originalUrl}`;
    const items = result.data.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? filter.id ?? ""),
      title: resolveItemTitle(item),
      summary: safeStringify(item),
      content: safeStringify(item),
      updated: item.updatedAt instanceof Date ? item.updatedAt : undefined,
      published: item.createdAt instanceof Date ? item.createdAt : undefined,
      link: item.id ? buildAdminRecordUrl(req, modelName, item.id as string | number) : undefined
    }));

    if (format === "atom") {
      const body = feedGenerator.generateAtom({
        title: String(filter.name ?? "Filter Feed"),
        subtitle: filter.description,
        link: feedLink,
        updated: new Date(),
        items,
        authorName: user.fullName ?? user.login
      });
      res.setHeader("Content-Type", "application/atom+xml");
      return res.send(body);
    }

    const body = feedGenerator.generateRss({
      title: String(filter.name ?? "Filter Feed"),
      subtitle: filter.description,
      link: feedLink,
      updated: new Date(),
      items,
      authorName: user.fullName ?? user.login
    });
    res.setHeader("Content-Type", "application/rss+xml");
    return res.send(body);
  } catch (error) {
    // Convert unhandled errors into a consistent response.
    const message = error instanceof Error ? error.message : String(error);
    const status = /access denied/i.test(message) ? 403 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}

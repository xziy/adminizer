import { ApiTokenManager } from "../../lib/public-api/ApiTokenManager";
import { ensureAuth } from "../filters/helpers";

const assertPermission = (
  req: ReqType,
  res: ResType,
  tokenId: string
): boolean => {
  if (!req.adminizer.config.auth.enable) {
    return true;
  }
  if (!req.user) {
    return false;
  }
  if (!req.adminizer.accessRightsHelper.hasPermission(tokenId, req.user)) {
    res.sendStatus(403);
    return false;
  }
  return true;
};

const getTokenManager = (req: ReqType) => new ApiTokenManager(req.adminizer);

export async function getApiToken(req: ReqType, res: ResType) {
  try {
    if (!ensureAuth(req, res)) {
      return res;
    }

    if (!assertPermission(req, res, "api-token-view")) {
      return res;
    }

    const manager = getTokenManager(req);
    const tokenInfo = await manager.getTokenInfo(req.user);
    return res.json({
      success: true,
      token: tokenInfo?.token ?? null,
      createdAt: tokenInfo?.createdAt ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createApiToken(req: ReqType, res: ResType) {
  try {
    if (!ensureAuth(req, res)) {
      return res;
    }

    if (!assertPermission(req, res, "api-token-create")) {
      return res;
    }

    const manager = getTokenManager(req);
    const tokenInfo = await manager.getOrCreateToken(req.user);
    return res.status(201).json({
      success: true,
      token: tokenInfo.token,
      createdAt: tokenInfo.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}

export async function regenerateApiToken(req: ReqType, res: ResType) {
  try {
    if (!ensureAuth(req, res)) {
      return res;
    }

    if (!assertPermission(req, res, "api-token-create")) {
      return res;
    }

    const manager = getTokenManager(req);
    const tokenInfo = await manager.regenerateToken(req.user);
    return res.json({
      success: true,
      token: tokenInfo.token,
      createdAt: tokenInfo.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}

export async function revokeApiToken(req: ReqType, res: ResType) {
  try {
    if (!ensureAuth(req, res)) {
      return res;
    }

    if (!assertPermission(req, res, "api-token-revoke")) {
      return res;
    }

    const manager = getTokenManager(req);
    await manager.revokeToken(req.user);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}

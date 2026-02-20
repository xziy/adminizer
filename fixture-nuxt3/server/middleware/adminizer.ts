import { fromNodeMiddleware } from "h3";
import { getAdminizerMiddleware } from "../utils/adminizer";

export default fromNodeMiddleware(async (req, res, next) => {
  const url = req.url ?? "";
  if (!url.startsWith("/adminizer")) {
    return next();
  }

  const middleware = await getAdminizerMiddleware();
  middleware(req, res, next);
});

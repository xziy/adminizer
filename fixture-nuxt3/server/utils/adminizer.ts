import type { IncomingMessage, ServerResponse } from "node:http";
import { Adminizer, type AdminpanelConfig } from "adminizer";
import { SequelizeAdapter } from "adminizer/lib/model/adapter/sequelize";
import { getSequelizeInstance } from "./sequelize";

const adminizerConfig: AdminpanelConfig = {
  routePrefix: "/adminizer",
  auth: {
    enable: false
  },
  models: {
    Post: {
      title: "Posts",
      model: "post",
      displayName: "title",
      fields: {
        title: { type: "string", required: true },
        content: { type: "text" },
        createdAt: false,
        updatedAt: false
      }
    }
  }
};

let middlewareInstance:
  | ((req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void)
  | null = null;

export async function getAdminizerMiddleware() {
  if (middlewareInstance) {
    return middlewareInstance;
  }

  const sequelize = await getSequelizeInstance();
  const adapter = new SequelizeAdapter(sequelize);
  const adminizer = new Adminizer([adapter]);

  await adminizer.init(adminizerConfig);
  middlewareInstance = adminizer.getMiddleware();

  return middlewareInstance;
}

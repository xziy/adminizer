import { Adminizer } from "../Adminizer";
import { UserAP } from "../../models/UserAP";

export type FilterAuditEvent =
  | "created"
  | "updated"
  | "deleted"
  | "previewed"
  | "executed";

export type FilterAuditPayload = {
  filterId?: string;
  modelName?: string;
  user?: UserAP;
  meta?: Record<string, unknown>;
};

export class FilterAuditLogger {
  constructor(private readonly adminizer: Adminizer) {}

  public record(event: FilterAuditEvent, payload: FilterAuditPayload): void {
    const userId = payload.user?.id ?? "unknown";
    const userLogin = payload.user?.login ?? "unknown";
    const meta = payload.meta ? ` ${JSON.stringify(payload.meta)}` : "";
    const modelName = payload.modelName ?? "unknown";
    const filterId = payload.filterId ?? "unknown";

    Adminizer.log.info(
      `[FilterAudit] ${event} filter=${filterId} model=${modelName} user=${userId}(${userLogin})${meta}`
    );
  }
}

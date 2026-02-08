import { Adminizer } from "../Adminizer";
import { ExportQueue } from "./ExportQueue";
import { ExportService } from "./ExportService";

export class ExportModule {
  public readonly queue: ExportQueue;
  public readonly service: ExportService;

  constructor(adminizer: Adminizer) {
    this.queue = new ExportQueue();
    this.service = new ExportService(adminizer, this.queue);
  }
}

export { ExportQueue } from "./ExportQueue";
export { ExportService } from "./ExportService";
export * from "./types";

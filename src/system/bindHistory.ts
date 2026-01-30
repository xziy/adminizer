import { Adminizer } from "../lib/Adminizer";
import { DefaultHistoryAdapter } from "../lib/history-actions/DefaultHistoryAdapter";
import { HistoryHandler } from "../lib/history-actions/HistoryHandler";

export default async function bindHistory(adminizer: Adminizer): Promise<void> {
    const adapter = adminizer.config?.history?.adapter;
    if (adapter === undefined || adapter === null || adapter === "default") {
        adminizer.historyHandler = new HistoryHandler();
        adminizer.historyHandler.add(new DefaultHistoryAdapter(adminizer))
    }
}

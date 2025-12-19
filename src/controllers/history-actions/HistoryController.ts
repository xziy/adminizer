import { AbstractHistoryAdapter } from "../../lib/history-actions/AbstrcatHistoryAdapter";

export class HistoryController {
    static async getModelHistory(req: ReqType, res: ResType) {
        HistoryController.checkHistoryPermission(req, res);

        const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
            `history-${req.adminizer.config.history?.adapter ?? 'default'}`,
            req.user
        );

        if (!hasPermission) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const {modelId, modelName} = req.body;

        if(!modelId || !modelName) {
            res.status(400).json({
                error: 'Model ID and name are required'
            });
        }

        const adapter = HistoryController.getAdapter(req);
        return res.json({
            data: await adapter.getHistory(modelId, modelName)
        });
    }

    static getAdapter(req: ReqType): AbstractHistoryAdapter {
        const adapter = req.adminizer.config.history?.adapter ?? 'default';
       return req.adminizer.historyHandler.get(adapter);
    }

    private static checkHistoryPermission(req: ReqType, res: ResType): void {
        if (!req.adminizer?.historyHandler) {
            res.status(500).json({ error: 'History system not initialized' });
            return;
        }
        // // Проверяем аутентификацию
        if (req.adminizer.config.auth.enable && !req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
    }
}
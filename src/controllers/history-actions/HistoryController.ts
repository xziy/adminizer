import { AbstractHistoryAdapter } from "../../lib/history-actions/AbstractHistoryAdapter";
const excludedModels = [
    'HistoryActionsAP',
    'MediaManagerAP',
    'MediaManagerAssociationsAP',
    'MediaManagerMetaAP',
    'NavigationAP',
    'NotificationAP',
    'UserNotificationAP',
]
export class HistoryController {

    static async index(req: ReqType, res: ResType) {
        if (!HistoryController.checkHistoryPermission(req, res)) return false

        if (req.method.toUpperCase() === 'GET') {
            const models = req.adminizer.modelHandler.all
                .filter(model => !excludedModels.includes(model.modelname))
                .map(model => model.modelname);

            return req.Inertia.render({
                component: 'history',
                props: {
                    title: req.i18n.__('History'),
                    models: models
                }
            });
        }

        if (req.method.toUpperCase() === 'POST') {
            const adapter = HistoryController.getAdapter(req);

            try {
                const data = await adapter.getAllHistory('', true)
                return res.json({ data: data })
            } catch (e) {
                return res.status(500).json({
                    error: 'Failed to load history. Please try again later or contact support.'
                });
            }
        }

        return res.status(405)
    }

    static async getModelHistoryList(req: ReqType, res: ResType) {
        if (!HistoryController.checkHistoryPermission(req, res)) return false
        const { model } = req.body
        
        if (!model) {
            return res.status(400).json({ error: 'Model parameter is required' });
        }

        const adapter = HistoryController.getAdapter(req);

        try {
            const data = await adapter.getAllHistory(model.toLowerCase(), false)
            return res.json({ data: data })
        } catch (e) {
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }

    }

    static async getModelHistory(req: ReqType, res: ResType) {
        if (!HistoryController.checkHistoryPermission(req, res)) return false

        const { modelId, modelName } = req.body;

        if (!modelId || !modelName) {
            return res.status(400).json({
                error: 'Model ID and name are required'
            });
        }

        const adapter = HistoryController.getAdapter(req);
        try {
            const data = await adapter.getAllModelHistory(modelId, modelName);
            return res.json({ data });
        } catch (e) {
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }
    }

    static async getModelFieldsHistory(req: ReqType, res: ResType) {
        if (!HistoryController.checkHistoryPermission(req, res)) return false

        const { historyId } = req.body;

        if (!historyId) {
            return res.status(400).json({
                error: 'History ID is required'
            })
        }
        const adapter = HistoryController.getAdapter(req);

        try {
            const data = await adapter.getModelHistory(+historyId, req.user)
            return res.json({ data: data })
        } catch (e) {
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }
    }


    static getAdapter(req: ReqType): AbstractHistoryAdapter {
        const adapter = req.adminizer.config.history?.adapter ?? 'default';
        return req.adminizer.historyHandler.get(adapter);
    }

    private static checkHistoryPermission(req: ReqType, res: ResType) {
        if (!req.adminizer?.historyHandler) {
            res.status(401).json({ error: 'History system not initialized' });
            return false
        }

        if (req.adminizer.config.auth.enable && !req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return false
        }

        const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
            `history-${req.adminizer.config.history?.adapter ?? 'default'}`,
            req.user
        );

        if (!hasPermission) {
            res.status(403).json({ error: 'Forbidden' });
            return false
        }
        return true
    }
}
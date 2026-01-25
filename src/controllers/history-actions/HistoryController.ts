import { Adminizer } from "../../lib/Adminizer";
import { AbstractHistoryAdapter } from "../../lib/history-actions/AbstractHistoryAdapter";
import { UserAP } from "../../models/UserAP";

export class HistoryController {

    static async index(req: ReqType, res: ResType): Promise<any> {
        if (!HistoryController.checkHistoryPermission(req, res)) return
        const adapter = HistoryController.getAdapter(req);

        if (req.method.toUpperCase() === 'GET') {
            const models = adapter.getModels(req.user);
            let users: UserAP[] = []

            const accessToUsersHistory = req.adminizer.accessRightsHelper.enoughPermissions([
                `users-history-${adapter.id}`
            ], req.user);

            if(accessToUsersHistory) users = await req.adminizer.modelHandler.model.get('userap')['_find']({}) as UserAP[]

            return req.Inertia.render({
                component: 'history',
                props: {
                    title: req.i18n.__('History'),
                    models,
                    users: users.map((user: UserAP) => ({
                        name: user.login
                    }))
                }
            });
        }

        if (req.method.toUpperCase() === 'POST') {
            const { model, limit, user, from, to, offset: skip } = req.body
            
            try {
                return res.json({
                    ...await adapter.getAllHistory(
                        req.user,
                        user, model.toLowerCase(),
                        limit,
                        skip,
                        from ? new Date(from) : null,
                        to ? new Date(to) : null)
                })
            } catch (e) {
                Adminizer.logger.error(e)

                return res.status(500).json({
                    error: 'Failed to load history. Please try again later or contact support.'
                });
            }
        }

        return res.status(405).end()
    }


    static async getAllModelHistory(req: ReqType, res: ResType): Promise<any> {
        if (!HistoryController.checkHistoryPermission(req, res)) return

        const { modelId, modelName } = req.body;

        if (!modelId || !modelName) {
            return res.status(400).json({
                error: 'Model ID and name are required'
            });
        }

        const adapter = HistoryController.getAdapter(req);
        try {
            const data = await adapter.getAllModelHistory(modelId, modelName, req.user);
            return res.json({ data });
        } catch (e) {
            Adminizer.logger.error(e)
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }
    }

    static async getModelFieldsHistory(req: ReqType, res: ResType): Promise<any> {
        if (!HistoryController.checkHistoryPermission(req, res)) return

        const { historyId } = req.body;

        if (!historyId) {
            return res.status(400).json({
                error: 'History ID is required'
            })
        }
        const adapter = HistoryController.getAdapter(req);

        try {
            const data = await adapter.getModelFieldsHistory(+historyId, req.user)
            return res.json({ data })
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

    private static checkHistoryPermission(req: ReqType, res: ResType): boolean {
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
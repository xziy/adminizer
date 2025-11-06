import {Adminizer} from "../lib/Adminizer";

export function bindCors(adminizer: Adminizer){
    if (adminizer.config?.cors?.enabled) {
        const corsConfig = adminizer.config.cors;

        // Поддерживаем массив разрешенных origin
        const allowedOrigins = Array.isArray(corsConfig.origin)
            ? corsConfig.origin
            : [corsConfig.origin];

        adminizer.app.all(`${adminizer.config.routePrefix}/${corsConfig.path}`, (req: any, res: any, next: any) => {
            const requestOrigin = req.headers.origin;

            // Проверяем разрешен ли origin
            const isOriginAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);

            if (requestOrigin && !isOriginAllowed) {
                console.log(`❌ CORS: Blocked request from ${requestOrigin}`);

                if (req.method === 'OPTIONS') {
                    // Для preflight - 200 без CORS headers
                    return res.status(200).end();
                } else {
                    // Для основных запросов - ошибка
                    return res.status(403).json({
                        error: 'CORS policy: Origin not allowed'
                    });
                }
            }

            // Запрос с разрешенного origin или без Origin
            if (isOriginAllowed) {
                // Для CORS запросов возвращаем тот же origin (или первый из списка)
                const allowOrigin = requestOrigin || allowedOrigins[0];
                res.header('Access-Control-Allow-Origin', allowOrigin);
                res.header('Access-Control-Allow-Credentials',
                    corsConfig.credentials !== false ? 'true' : 'false');
                res.header('Access-Control-Allow-Methods',
                    corsConfig.methods?.join(',') || 'GET,POST,PUT,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers',
                    corsConfig.allowedHeaders?.join(',') || 'Content-Type,Authorization,X-Requested-With,X-CSRF-Token,x-xsrf-token');
            }

            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }

            next();
        });

        console.log('✅ API CORS middleware enabled. Allowed origins:', allowedOrigins);
    }
}

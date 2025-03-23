import { Inertia } from '../lib/inertiaAdapter';
import { Flash } from '../lib/flash';

type FlashMessages = 'info' | 'error' | 'success';

declare module 'express-serve-static-core' {
    interface Request {
        Inertia: Inertia;
        flash: Flash<FlashMessages>;
    }
}

declare module 'express-session' {
    export interface SessionData {
        flashMessages: Record<string, string[]>;
        xInertiaCurrentComponent: string | undefined;
    }
}

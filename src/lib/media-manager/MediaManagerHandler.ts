import {AbstractMediaManager} from "./AbstractMediaManager";
import {Adminizer} from "../Adminizer";

export class MediaManagerHandler {
    private static managers: AbstractMediaManager[] = []

    public static add(manager: AbstractMediaManager) {
        this.managers.push(manager)
    }

    public static get(id: string): AbstractMediaManager {
        let instance = this.managers.find(e => e.id === id)
        /**
         * ✨ We magically get one
         */
        if (!instance && (id === 'default' || id === undefined) && this.managers.length === 1) {
            instance = this.managers[0]
        }
        if (!instance) {
            Adminizer.log.debug(`MediaManager with id ${id} not found`)
        }
        Adminizer.log.debug(`ins`, instance)
        return instance
    }
}

import * as fs from "fs";
import * as path from "path";
import {Adminizer} from "./Adminizer";
import {pathToFileURL} from "url";

class PolicyManager {
    private readonly _adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this._adminizer = adminizer;
    }

    async loadPolicies() {
        try {
            const policiesDirPath = path.join(import.meta.dirname, "../../policies");
            const policiesDir = fs.readdirSync(policiesDirPath);
            for (const policyFile of policiesDir) {
                if (path.extname(policyFile).toLowerCase() === ".js") {
                    const policyPath = path.join(policiesDirPath, policyFile);
                    const policy = (await import(pathToFileURL(policyPath).href)).default;
                    if (
                        typeof policy === "function" &&
                        Array.isArray(this._adminizer.config.policies)
                    ) {
                        this._adminizer.config.policies.push(policy);
                    } else {
                        Adminizer.log.error(
                            `Adminizer > Policy ${policyFile} is not a function`
                        );
                    }
                }
            }

            Adminizer.log.info("Adminizer policies loaded")
        } catch (e) {
            
            Adminizer.log.error("Adminizer > Could not load policies", e);
        }
    }

    bindPolicies(policies: MiddlewareType[], action: MiddlewareType): MiddlewareType[] {
        const result = [];

        const bindPolicy = (policy: MiddlewareType) => {
            if (typeof policy === "function") {
                result.push(policy);
            } else {
                Adminizer.log.error(
                    "AdminPanel: Policy format unknown: " + policy
                );
            }
        };

        if (Array.isArray(policies)) {
            policies.forEach(bindPolicy);
        } else {
            bindPolicy(policies);
        }

        result.push(action);
        return result;
    }
}

export default PolicyManager;

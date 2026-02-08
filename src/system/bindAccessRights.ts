import { GroupAP } from "../models/GroupAP";
import {Adminizer} from "../lib/Adminizer";

export default async function bindAccessRights(adminizer: Adminizer) {
    if (adminizer.config.models) {
        let models = adminizer.config.models;
        for (let key of Object.keys(models)) {
            
            const model = models[key];
            if (typeof model !== "boolean") {
                let modelName = model.model;
                let department = `Model ${key}`;

                // create
                adminizer.accessRightsHelper.registerToken({
                    id: `create-${modelName}-model`, name: "Create",
                    description: "Access to creating record in database", department: department
                });

                // read
                adminizer.accessRightsHelper.registerToken({
                    id: `read-${modelName}-model`, name: "Read",
                    description: "Access to reading records in database", department: department
                });

                // update
                adminizer.accessRightsHelper.registerToken({
                    id: `update-${modelName}-model`, name: "Update",
                    description: "Access to updating records in database", department: department
                });

                // delete
                adminizer.accessRightsHelper.registerToken({
                    id: `delete-${modelName}-model`, name: "Delete",
                    description: "Access to deleting records in database", department: department
                });
            }
        }
    }

    if (adminizer.config.forms && adminizer.config.forms.data) {
        let forms = adminizer.config.forms.data;
        for (let key of Object.keys(forms)) {
            let department = `Form ${key}`;

            // create
            adminizer.accessRightsHelper.registerToken({
                id: `create-${key}-form`, name: "Create",
                description: "Access to creating form in database", department: department
            });

            // read
            adminizer.accessRightsHelper.registerToken({
                id: `read-${key}-form`, name: "Read",
                description: "Access to reading form in database", department: department
            });

            // update
            adminizer.accessRightsHelper.registerToken({
                id: `update-${key}-form`, name: "Update",
                description: "Access to updating form in database", department: department
            });

            // delete
            adminizer.accessRightsHelper.registerToken({
                id: `delete-${key}-form`, name: "Delete",
                description: "Access to deleting form in database", department: department
            });
        }
    }

    // Widgets
    adminizer.accessRightsHelper.registerToken({
        id: `widgets`, name: "Widgets",
        description: "Access to widgets", department: "Widgets"
    });

    // Allow access login
    adminizer.accessRightsHelper.registerToken({
        id: 'access-to-adminpanel',
        name: "Allowed log in",
        description: "Are users allowed to log in to the admin panel?",
        department: "Admin panel"
    });

    // Filters & Public API tokens
    const filtersDepartment = "Filters";
    adminizer.accessRightsHelper.registerToken({
        id: "create-filter",
        name: "Create Filter",
        description: "Allows user to create filters",
        department: filtersDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "read-filter",
        name: "Read Filters",
        description: "Allows user to view filters",
        department: filtersDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "update-filter",
        name: "Update Filter",
        description: "Allows user to update filters",
        department: filtersDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "delete-filter",
        name: "Delete Filter",
        description: "Allows user to delete filters",
        department: filtersDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "publish-filter",
        name: "Publish Filter",
        description: "Allows user to publish filters",
        department: filtersDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "share-filter",
        name: "Share Filter",
        description: "Allows user to share filters",
        department: filtersDepartment
    });

    const publicApiDepartment = "Public API";
    adminizer.accessRightsHelper.registerToken({
        id: "api-token-create",
        name: "Create API Token",
        description: "Allows user to create or regenerate API token",
        department: publicApiDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "api-public-access",
        name: "Public API Access",
        description: "Allows access to public API endpoints",
        department: publicApiDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "api-token-view",
        name: "View API Token",
        description: "Allows user to view API token",
        department: publicApiDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "api-token-revoke",
        name: "Revoke API Token",
        description: "Allows user to revoke API token",
        department: publicApiDepartment
    });

    const exportDepartment = "Data Export";
    adminizer.accessRightsHelper.registerToken({
        id: "export-json",
        name: "Export JSON",
        description: "Allows exporting data to JSON",
        department: exportDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "export-excel",
        name: "Export Excel",
        description: "Allows exporting data to Excel",
        department: exportDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "export-feed",
        name: "Export Feed",
        description: "Allows exporting data to Atom/RSS",
        department: exportDepartment
    });
    adminizer.accessRightsHelper.registerToken({
        id: "export-bulk",
        name: "Export Bulk",
        description: "Allows bulk export operations",
        department: exportDepartment
    });

    // Default user group
    if (adminizer.config.registration && adminizer.config.registration.enable) {
        // TODO refactor CRUD functions for DataAccessor usage
        let defaultUserGroupRecord: GroupAP = await adminizer.modelHandler.model.get("GroupAP")["_findOne"]({name: adminizer.config.registration.defaultUserGroup});
        if (!defaultUserGroupRecord) {
            // TODO refactor CRUD functions for DataAccessor usage
            await adminizer.modelHandler.model.get("GroupAP")?.["_create"]({
                name: adminizer.config.registration.defaultUserGroup,
                description: "Group for default users (guests) who dont have access to fields"
            })
        }
    }
}

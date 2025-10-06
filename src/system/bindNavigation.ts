import {Navigation} from "../lib/catalog/Navigation";
import {Adminizer} from "../lib/Adminizer";

export async function bindNavigation(adminizer: Adminizer) {
    if (adminizer.config.navigation) {
        try {
            adminizer.config.navigation.model = adminizer.config.navigation.model ? adminizer.config.navigation.model : 'NavigationAP'
            let navigation = new Navigation(adminizer, adminizer.config.navigation)
            adminizer.catalogHandler.add(navigation)
            adminizer.config.models[adminizer.config.navigation.model.toLowerCase()] = {
                add: false,
                edit: {
                    controller: '../controllers/navigation/edit',
                },
                fields: {
                    createdAt: false,
                    updatedAt: false
                },
                navbar: {
                    visible: false
                },
                icon: 'storage',
                identifierField: "",
                list: {
                    fields: {
                        tree: false,
                        id: false,
                    },
                },
                model: adminizer.config.navigation.model.toLowerCase(),
                remove: false,
                title: adminizer.config.navigation.model,
                tools: []
            }
        } catch (e) {
            console.log('bindNavigation Error: ', e)
        }
    }
}

import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/controls/markdown/ToastUiEditor";
import {Adminizer} from "../lib/Adminizer";
import {Handsontable} from "../lib/controls/table/Handsontable";
import {JsonEditor} from "../lib/controls/jsoneditor/JsonEditor";

export function bindControls(adminizer: Adminizer): void {
    // bind wysiwyg
    adminizer.controlsHandler.add(new CKeditor(adminizer.config.routePrefix))
    // bind markdown
    adminizer.controlsHandler.add(new ToastUiEditor(adminizer.config.routePrefix))
    // bind table
    adminizer.controlsHandler.add(new Handsontable(adminizer.config.routePrefix))
    // bind json editor
    adminizer.controlsHandler.add(new JsonEditor(adminizer.config.routePrefix))
}

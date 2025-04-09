import {ControlsHandler} from "../lib/controls/ControlsHandler";
import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/controls/markdown/ToastUiEditor";
import {Adminizer} from "../lib/Adminizer";

export function bindControls(adminizer: Adminizer): void {
    // bind wysiwyg
    adminizer.controlsHandler.add(new CKeditor(adminizer.config.routePrefix))
    // bind markdown
    adminizer.controlsHandler.add(new ToastUiEditor(adminizer.config.routePrefix))
}

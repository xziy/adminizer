import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/controls/markdown/ToastUiEditor";
import {Adminizer} from "../lib/Adminizer";
import {Handsontable} from "../lib/controls/table/Handsontable";
import {JsonEditor} from "../lib/controls/jsoneditor/JsonEditor";
import {MonacoEditor} from "../lib/controls/codeEditor/MonacoEditor";

export function bindControls(adminizer: Adminizer): void {
    // bind wysiwyg
    adminizer.controlsHandler.add(new CKeditor(adminizer))
    // bind markdown
    adminizer.controlsHandler.add(new ToastUiEditor(adminizer))
    // bind table
    adminizer.controlsHandler.add(new Handsontable(adminizer))
    // bind json editor
    adminizer.controlsHandler.add(new JsonEditor(adminizer))
    // bind code editor
    adminizer.controlsHandler.add(new MonacoEditor(adminizer))
}

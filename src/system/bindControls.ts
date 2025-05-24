import {CKeditor} from "../lib/v4/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/v4/controls/markdown/ToastUiEditor";
import {Adminizer} from "../lib/Adminizer";
import {Handsontable} from "../lib/v4/controls/table/Handsontable";
import {JsonEditor} from "../lib/v4/controls/jsoneditor/JsonEditor";
import {MonacoEditor} from "../lib/v4/controls/codeEditor/MonacoEditor";
import {GeoEditor} from "../lib/v4/controls/geojsoneditor/GeoEditor";

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
    //bind geo json editor
    adminizer.controlsHandler.add(new GeoEditor(adminizer))
}

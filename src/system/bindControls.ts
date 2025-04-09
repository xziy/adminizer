import {ControlsHandler} from "../lib/controls/ControlsHandler";
import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";

export function bindControls(handler: ControlsHandler): void {
    // bind wysiwyg
    handler.add(new CKeditor())
}

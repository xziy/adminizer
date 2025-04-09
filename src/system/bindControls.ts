import {ControlsHandler} from "../lib/controls/ControlsHandler";
import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/controls/markdown/ToastUiEditor";

export function bindControls(handler: ControlsHandler): void {
    // bind wysiwyg
    handler.add(new CKeditor())
    handler.add(new ToastUiEditor())
}

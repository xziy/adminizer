type ControlType = 'wysiwyg' | 'ace' | 'jsonEditor' | 'geoJson'

export abstract class AbstractControls {
    public readonly name: string;
    public readonly type: ControlType
}

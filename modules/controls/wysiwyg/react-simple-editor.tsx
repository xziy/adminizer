import {useCallback} from 'react';
import Editor, {ContentEditableEvent} from 'react-simple-wysiwyg';

interface EditorProps {
    initialValue: string,
    onChange: (value: string) => void
}

export default function ReactSimpleEditor({initialValue, onChange}: EditorProps) {

    const handleEditorChange = useCallback((e: ContentEditableEvent) => {
        onChange(e.target.value);
    }, [initialValue]);
    return (
        <Editor value={initialValue} onChange={handleEditorChange}/>
    );
}

import { Editor, EditorProps } from '@toast-ui/react-editor';
import { useCallback, useRef } from "react";

interface TuiEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    options?: EditorProps; // Используем Partial, чтобы все опции были необязательными
}

const ToastEditor = ({ initialValue = '', onChange, options }: TuiEditorProps) => {
    const editorRef = useRef<Editor>(null);

    const handleEditorChange = useCallback(() => {
        const editorInstance = editorRef.current?.getInstance();
        const markdown = editorInstance?.getMarkdown();

        if (onChange && markdown) {
            onChange(markdown);
        }
    }, [onChange]);

    // Дефолтные опции
    const defaultOptions = {
        previewStyle: 'vertical',
        height: '600px',
        initialEditType: 'markdown',
        useCommandShortcut: true,
    };

    // Объединяем дефолтные опции с переданными через props
    const editorOptions = {
        ...defaultOptions,
        ...options,
    };

    return (
        <Editor
            ref={editorRef}
            initialValue={initialValue}
            onChange={handleEditorChange}
            autofocus={false}
            {...editorOptions}
        />
    );
};

export default ToastEditor;

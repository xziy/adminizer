import { Editor, EditorProps } from '@toast-ui/react-editor';
import { useCallback, useRef, useEffect, useState } from "react";
import useWindowSize from "@/hooks/use-window-size.ts";
import {useAppearance} from "@/hooks/use-appearance.tsx";

interface TuiEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    options?: EditorProps;
}

const ToastEditor = ({ initialValue = '', onChange, options }: TuiEditorProps) => {
    const editorRef = useRef<Editor>(null);
    const { width } = useWindowSize();
    const [theme, setTheme] = useState<string>('dark')
    const {appearance} = useAppearance()
    const [editorOptions, setEditorOptions] = useState<EditorProps>({
        height: '600px',
        initialEditType: 'markdown',
        useCommandShortcut: true,
    });

    useEffect(() => {
        if (appearance === 'dark') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, [appearance]);

    const handleEditorChange = useCallback(() => {
        const editorInstance = editorRef.current?.getInstance();
        const markdown = editorInstance?.getMarkdown();

        if (onChange && markdown) {
            onChange(markdown);
        }
    }, [onChange]);

    // Update editor options based on window size and options prop
    useEffect(() => {
        const isMobileView = width < 1200;

        setEditorOptions(prev => ({
            ...prev,
            ...options, // First apply the options props
            previewStyle: isMobileView ? 'tab' : options?.previewStyle || 'vertical',
            height: options?.height || '600px',
            initialEditType: options?.initialEditType || 'markdown',
            useCommandShortcut: options?.useCommandShortcut !== undefined
                ? options.useCommandShortcut
                : true,
        }));

        // Update instance editor when the options change
        if (editorRef.current) {
            const editorInstance = editorRef.current.getInstance();
            editorInstance.changePreviewStyle(isMobileView ? 'tab' : options?.previewStyle || 'vertical');
        }
    }, [width, options, theme]);

    return (
        <Editor
            key={`editor-${theme}`}
            ref={editorRef}
            initialValue={initialValue}
            onChange={handleEditorChange}
            autofocus={false}
            theme={theme}
            {...editorOptions}
        />
    );
};

export default ToastEditor;

import Editor from '@monaco-editor/react';
import {FC, useEffect, useState} from "react";
import {useAppearance} from "@/hooks/use-appearance.tsx";

interface MonacoEditorProps {
    onChange: (value: string) => void;
    value: string
    options: {language: string}
}

const MonacoEditor: FC<MonacoEditorProps> = ({onChange, value, options}) => {
    const {appearance} = useAppearance()
    const [theme, setTheme] = useState<string>('light')

    function handleEditorChange(value: string | undefined,) {
        onChange(value as string)
    }

    useEffect(() => {
        if (appearance === 'dark') {
            setTheme('vs-dark');
        } else {
            setTheme('light');
        }
    }, [appearance]);

    return (
        <Editor
            height="400px"
            defaultLanguage={options.language}
            defaultValue={value}
            theme={theme}
            className='border'
            onChange={handleEditorChange}
        />
    );
}

export default MonacoEditor

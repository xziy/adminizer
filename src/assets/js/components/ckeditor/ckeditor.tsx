/**
 * This configuration was generated using the CKEditor 5 Builder. You can modify it anytime using this link:
 * https://ckeditor.com/ckeditor-5/builder/#installation/NoNgNARATAdALDADBSBGRVUFZUkwdjhFU0T30UMQA5qR8oQ58SsQ64aUIBTAOxSIwwVGCHixYVAF1IWagEMoPfAGYI0oA===
 */

import {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {CKEditor} from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Alignment,
    Autosave,
    BlockQuote,
    Bold,
    Essentials,
    Heading,
    HorizontalLine,
    ImageBlock,
    ImageEditing,
    ImageInline,
    ImageInsertViaUrl,
    ImageTextAlternative,
    ImageToolbar,
    ImageUtils,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    ListProperties,
    Paragraph,
    ShowBlocks,
    SourceEditing,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    Underline, EditorConfig, EventInfo
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

interface EditorProps {
    initialValue: string,
    onChange: (value: string) => void
    options?: { items?: string[]}
}

/**
 * Create a free account with a trial: https://portal.ckeditor.com/checkout?plan=free
 */

export default function AdminCKEditor({initialValue, onChange, options}: EditorProps) {
    const editorContainerRef = useRef(null);
    const editorRef = useRef(null);
    const [isLayoutReady, setIsLayoutReady] = useState(false);

    useEffect(() => {
        setIsLayoutReady(true);

        return () => setIsLayoutReady(false);
    }, []);
    const editorConfig = useMemo<EditorConfig>((): EditorConfig => {
        if (!isLayoutReady) {
            return {};
        }
        return {
            toolbar: {
                items: options?.items ?? [],
                shouldNotGroupWhenFull: true
            },
            plugins: [
                Alignment,
                Autosave,
                BlockQuote,
                Bold,
                Essentials,
                Heading,
                HorizontalLine,
                ImageBlock,
                ImageEditing,
                ImageInline,
                ImageInsertViaUrl,
                ImageTextAlternative,
                ImageToolbar,
                ImageUtils,
                Indent,
                IndentBlock,
                Italic,
                Link,
                List,
                ListProperties,
                Paragraph,
                ShowBlocks,
                SourceEditing,
                Table,
                TableCaption,
                TableCellProperties,
                TableColumnResize,
                TableProperties,
                TableToolbar,
                Underline
            ],
            heading: {
                options: [
                    {
                        model: 'paragraph',
                        title: 'Paragraph',
                        class: 'ck-heading_paragraph'
                    },
                    {
                        model: 'heading1',
                        view: 'h1',
                        title: 'Heading 1',
                        class: 'ck-heading_heading1'
                    },
                    {
                        model: 'heading2',
                        view: 'h2',
                        title: 'Heading 2',
                        class: 'ck-heading_heading2'
                    },
                    {
                        model: 'heading3',
                        view: 'h3',
                        title: 'Heading 3',
                        class: 'ck-heading_heading3'
                    },
                    {
                        model: 'heading4',
                        view: 'h4',
                        title: 'Heading 4',
                        class: 'ck-heading_heading4'
                    },
                    {
                        model: 'heading5',
                        view: 'h5',
                        title: 'Heading 5',
                        class: 'ck-heading_heading5'
                    },
                    {
                        model: 'heading6',
                        view: 'h6',
                        title: 'Heading 6',
                        class: 'ck-heading_heading6'
                    }
                ]
            },
            image: {
                toolbar: ['imageTextAlternative']
            },
            initialData: initialValue,
            licenseKey: 'GPL',
            link: {
                addTargetToExternalLinks: true,
                defaultProtocol:
                    'https://',
                decorators: {
                    toggleDownloadable: {
                        mode: 'manual',
                        label:
                            'Downloadable',
                        attributes: {
                            download: 'file'
                        }
                    }
                }
            },
            list: {
                properties: {
                    styles: true,
                    startIndex: true,
                    reversed: true
                }
            },
            placeholder: 'Type or paste your content here!',
            table: {
                contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
            }
        };
    }, [isLayoutReady]);

    const handleEditorChange = useCallback((event: EventInfo, editor: ClassicEditor) => {
        const data = editor.getData();
        if(event.name === "change:data") onChange(data);
    }, [initialValue]);

    return (
        <div className="max-fit">
            <div className="editor-container editor-container_classic-editor" ref={editorContainerRef}>
                <div className="editor-container__editor">
                    <div ref={editorRef}>{editorConfig &&
                        <CKEditor editor={ClassicEditor} config={editorConfig} onChange={handleEditorChange}/>}</div>
                </div>
            </div>
        </div>
    );
}

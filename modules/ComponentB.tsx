import {useState} from "react";
import Editor from 'react-simple-wysiwyg';
import {ContentEditableEvent} from "react-simple-wysiwyg/lib/editor/ContentEditable";

interface AppContentProps {
    message?: string;
}

export default function ComponentB({message}: AppContentProps) {
    const [state, setState] = useState(0)
    const [html, setHtml] = useState('my <b>HTML</b>');
    const handleClick = () => setState(state + 1)

    function onChange(e: ContentEditableEvent) {
        setHtml(e.target.value);
    }

    return (
        <>
            <div>
                <h1>{message}</h1>
                <button onClick={handleClick}>Click me</button>
                <h2>State is {state}</h2>
            </div>
            <Editor value={html} onChange={onChange}/>
        </>
    )
}

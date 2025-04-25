import {useState} from "react";
import {Button} from "@/components/ui/button.tsx";

interface AppContentProps {
    message?: string;
}

export default function ComponentB({message}: AppContentProps) {
    const [state, setState] = useState(0)
    const handleClick = () => setState(state + 1)

    return (
        <div className="grid gap-4">
            <h1>{message}</h1>
            <Button onClick={handleClick} className="w-fit">Click me</Button>
            <h2>State is {state}</h2>
        </div>
    )
}

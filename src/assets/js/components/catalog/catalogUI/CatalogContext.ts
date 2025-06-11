import {createContext, Dispatch, SetStateAction} from "react";

interface CatalogContextProps {
    messages: Record<string, string>;
    setMessages: Dispatch<SetStateAction<Record<string, string>>>;
}

export const CatalogContext = createContext<CatalogContextProps>({
    messages: {},
    setMessages: () => {},
});
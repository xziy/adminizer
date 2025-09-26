import {type PropsWithChildren, useEffect} from 'react';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';

const DEFAULT_PANEL_WIDTH = 'min(25vw, 420px)';
const MARGIN_TRANSITION = 'margin-right 300ms ease-in-out';

export function AiAssistantViewport({children, panelWidth = DEFAULT_PANEL_WIDTH}: PropsWithChildren<{panelWidth?: string}>) {
    const {isEnabled, isOpen} = useAiAssistant();

    useEffect(() => {
        const root = document.getElementById('app');
        if (!root) {
            return;
        }

        const previousTransition = root.style.transition;
        const hasMarginTransition = previousTransition?.includes('margin-right');
        if (!hasMarginTransition) {
            root.style.transition = previousTransition
                ? `${previousTransition}, ${MARGIN_TRANSITION}`
                : MARGIN_TRANSITION;
        }

        root.classList.add('ai-assistant-host');
        root.style.setProperty('--ai-assistant-panel-width', panelWidth);

        return () => {
            root.classList.remove('ai-assistant-host');
            root.style.removeProperty('--ai-assistant-panel-width');
            root.style.removeProperty('margin-right');
            delete root.dataset.aiAssistantOpen;
            if (!hasMarginTransition) {
                root.style.transition = previousTransition;
            }
        };
    }, [panelWidth]);

    useEffect(() => {
        const root = document.getElementById('app');
        if (!root) {
            return;
        }

        if (isEnabled && isOpen) {
            root.style.marginRight = panelWidth;
            root.dataset.aiAssistantOpen = 'true';
        } else {
            root.style.removeProperty('margin-right');
            root.dataset.aiAssistantOpen = 'false';
        }
    }, [isEnabled, isOpen, panelWidth]);

    return (
        <>
            {children}
            <AiAssistantPanel width={panelWidth}/>
        </>
    );
}

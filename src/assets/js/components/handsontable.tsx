import {HotTable, HotColumn} from '@handsontable/react';
import {registerAllModules} from 'handsontable/registry';
//@ts-ignore
import {ColumnSettings, GridSettings} from "handsontable/settings";
import {useCallback, useEffect, useRef, useState} from 'react';
import {RowObject} from "handsontable/common";
import {useAppearance} from "@/hooks/use-appearance.tsx";
import {
    registerLanguageDictionary,
    deDE,
    enUS,
    esMX,
    frFR,
    itIT,
    jaJP,
    koKR,
    nlNL,
    plPL,
    ptBR,
    ruRU,
    zhCN
} from 'handsontable/i18n';

registerAllModules();

const languageDictionaries: Record<string, {
    [p: string]: string | string[]
    languageCode: string
}> = {
    'de': deDE,
    'en': enUS,
    'es': esMX,
    'fr': frFR,
    'it': itIT,
    'ja': jaJP,
    'ko': koKR,
    'nl': nlNL,
    'pl': plPL,
    'pt': ptBR,
    'ru': ruRU,
    'zh': zhCN,
};

const docLang = document.documentElement.lang

const lang = languageDictionaries[docLang] ?? languageDictionaries['en']

registerLanguageDictionary(lang);

interface TableProps {
    config: GridSettings;
    data?: any[][] | RowObject[] | undefined;
    onChange: (data: any) => void;
}

const HandsonTable = ({config, data = [], onChange}: TableProps) => {
    const {appearance} = useAppearance()
    const [theme, setTheme] = useState<string>('ht-theme-main')

    const handleChange = useCallback((_changes: any[], source: string) => {
        if (source === 'loadData') {
            return;
        }
        const hotData = hotTableRef.current?.hotInstance?.getSourceData();
        onChange(hotData);
    }, []);
    const hotTableRef = useRef<any>(null);

    useEffect(() => {
        if (hotTableRef.current) {
            hotTableRef.current.hotInstance.loadData(data);
        }
    }, [data]);

    useEffect(() => {
        if (appearance === 'dark') {
            setTheme('ht-theme-main-dark');
        } else {
            setTheme('ht-theme-main');
        }
    }, [appearance]);

    return (
        <HotTable
            themeName={theme}
            language={lang.languageCode}
            ref={hotTableRef}
            {...config}
            afterChange={handleChange}
        >
            {config.columns.map((item: ColumnSettings) => (
                <HotColumn
                    key={item.data}
                    data={item.data}
                    {...item}
                />
            ))}
        </HotTable>
    );
};

export default HandsonTable;

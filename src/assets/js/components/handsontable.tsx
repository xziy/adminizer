import {HotTable, HotColumn} from '@handsontable/react';
import {registerAllModules} from 'handsontable/registry';
//@ts-ignore
import {ColumnSettings, GridSettings} from "handsontable/settings";
import {useCallback, useEffect, useRef, useState} from 'react';
import {RowObject} from "handsontable/common";
import {useAppearance} from "@/hooks/use-appearance.tsx";

registerAllModules();

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

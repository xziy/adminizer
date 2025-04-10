import {HotTable, HotColumn} from '@handsontable/react';
import {registerAllModules} from 'handsontable/registry';
//@ts-ignore
import {ColumnSettings, GridSettings} from "handsontable/settings";
import {useCallback, useRef} from 'react';
import {RowObject} from "handsontable/common";

registerAllModules();

interface TableProps {
    config: GridSettings;
    data?: any[][] | RowObject[] | undefined;
    onChange?: (data: any[], source?: string) => void;
}

const HandsoneTable = ({config, data = [], onChange}: TableProps) => {

    const handleChange = useCallback((_changes: any[], source: string) => {
        if (source === 'loadData') {
            return;
        }

        if (onChange) {
            const hotData = hotTableRef.current?.hotInstance?.getData();
            onChange(hotData || []);
        }
    }, [onChange]);

    const hotTableRef = useRef<any>(null);

    return (
        <HotTable
            ref={hotTableRef}
            data={data}
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

export default HandsoneTable;

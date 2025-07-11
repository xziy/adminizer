import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {MediaProps} from "@/types";


const MediaTable = ({mediaList}: MediaProps) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="p-2 text-left">Файл</TableHead>
                    <TableHead className="p-2 text-left">Имя</TableHead>
                    <TableHead className="p-2 text-left">Дата</TableHead>
                    <TableHead className="p-2 text-left">Тип</TableHead>
                    <TableHead className="p-2 text-left">Размер (orig.)</TableHead>
                    <TableHead className="p-2 text-left">W x H (orig.)</TableHead>
                    <TableHead className="p-2 text-left">Sizes/Ver</TableHead>
                    <TableHead className="p-2 text-left">Locales</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mediaList.map((media) => (
                    <TableRow key={media.id}>
                        <TableCell className="font-medium">{media.id}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
export default MediaTable
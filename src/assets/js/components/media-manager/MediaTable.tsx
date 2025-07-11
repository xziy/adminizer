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
import Image from "@/components/media-manager/Image.tsx";


const MediaTable = ({mediaList}: MediaProps) => {
    return (
        <Table>
            <TableHeader className="sticky top-0 bg-background shadow">
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
                        <TableCell className="p-2">
                            <Image media={media} className="max-w-[75px]" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
export default MediaTable
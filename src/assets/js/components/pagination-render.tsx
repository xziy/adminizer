import {FC} from "react";
import {PaginationResult} from "@/lib/pagination.ts";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination.tsx";

interface PaginationProps {
    pagination: PaginationResult
    pageChange: (page: number) => void
    currentPage: number
}

const PaginationRender: FC<PaginationProps> = ({pagination, pageChange, currentPage}) => {
    // Получаем все числовые страницы (исключая Previous/Next)
    const numericPages = pagination.links
        .filter(link => link.label !== 'Previous' && link.label !== 'Next')
        .map(link => parseInt(link.label));

    // Проверяем, видна ли первая страница в основном списке
    const isFirstPageVisible = numericPages.includes(1);
    // Проверяем, видна ли последняя страница в основном списке
    const isLastPageVisible = numericPages.includes(pagination.last_page);

    return (
        <Pagination>
            <PaginationContent className="flex-wrap">
                {/* First Page Button*/}
                <PaginationItem className={`${!isFirstPageVisible ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <PaginationLink
                        className={`px-6 cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage !== 1) {
                                pageChange(1)
                            }
                        }}
                    >
                        First
                    </PaginationLink>
                </PaginationItem>
                {/* Previous Page Button */}
                <PaginationItem>
                    <PaginationPrevious
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.prev_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.prev_page_url) {
                                pageChange(currentPage - 1)
                            }
                        }}
                    />
                </PaginationItem>
                {/* Page Numbers */}
                {pagination.links.map((link, index) => {
                    if (link.label === 'Previous' || link.label === 'Next') return null;
                    return (
                        <PaginationItem key={index}>
                            <PaginationLink
                                className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${link.active ? '!bg-primary dark:!bg-muted-foreground !text-primary-foreground dark:!text-ring' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    const pageNumber = parseInt(link.label)
                                    pageChange(pageNumber)
                                }}
                                isActive={link.active}
                            >
                                {link.label}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}
                {/* Next Page Button */}
                <PaginationItem>
                    <PaginationNext
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.next_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.next_page_url) {
                                pageChange(currentPage + 1)
                            }
                        }}
                    />
                </PaginationItem>
                {/* Last Page Button  */}
                <PaginationItem className={`${!isLastPageVisible ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <PaginationLink
                        className={`px-6 cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${currentPage === pagination.last_page ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage !== pagination.last_page) {
                                pageChange(pagination.last_page)
                            }
                        }}
                    >
                        Last
                    </PaginationLink>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};

export default PaginationRender;

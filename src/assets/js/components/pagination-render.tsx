import {FC} from "react";
import {PaginationResult} from "@/lib/pagination.ts";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink, PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination.tsx";

interface PaginationProps {
    pagination: PaginationResult
    pageChange: (page: number) => void
    currentPage: number
}

const PaginationRender: FC<PaginationProps> = ({pagination, pageChange, currentPage}) => {
    return(
        <Pagination>
            <PaginationContent>
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
                {pagination.links.map((link, index) => {
                    if (link.label === 'Previous' || link.label === 'Next') return null
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
                    )
                })}
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
            </PaginationContent>
        </Pagination>
    )
}

export default PaginationRender

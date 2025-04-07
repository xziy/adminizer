interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationResult {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
    from: number;
    to: number;
    links: PaginationLink[];
}

interface PaginationOptions {
    path?: string;
    showPages?: number;
}

// Базовая функция (можно использовать вне React)
export function generatePagination(
    recordsTotal: number,
    count: number,
    currentPage: number,
    options: PaginationOptions = {}
): PaginationResult {
    const {
        path = 'http://localhost',
        showPages = 5,
    } = options;

    const lastPage = Math.ceil(recordsTotal / count);
    const from = (currentPage - 1) * count + 1;
    const to = Math.min(currentPage * count, recordsTotal);

    const links: PaginationLink[] = [];

    // Previous link
    links.push({
        url: currentPage > 1 ? `${path}?page=${currentPage - 1}` : null,
        label: 'Previous',
        active: false,
    });

    // Calculate page range
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(lastPage, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
        startPage = Math.max(1, endPage - showPages + 1);
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
        links.push({
            url: `${path}?page=${page}`,
            label: page.toString(),
            active: page === currentPage,
        });
    }

    // Next link
    links.push({
        url: currentPage < lastPage ? `${path}?page=${currentPage + 1}` : null,
        label: 'Next',
        active: false,
    });

    return {
        total: recordsTotal,
        per_page: count,
        current_page: currentPage,
        last_page: lastPage,
        first_page_url: `${path}?page=1`,
        last_page_url: `${path}?page=${lastPage}`,
        next_page_url: currentPage < lastPage ? `${path}?page=${currentPage + 1}` : null,
        prev_page_url: currentPage > 1 ? `${path}?page=${currentPage - 1}` : null,
        path,
        from,
        to,
        links,
    };
}

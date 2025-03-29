import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import {NavUser} from "@/components/nav-user.tsx";
import { Button } from './ui/button';
import {Icon} from "@/components/icon";
import { useAppearance } from '@/hooks/use-appearance';
import {Moon, Sun} from "lucide-react"

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { appearance, updateAppearance } = useAppearance();
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1"/>
                    <Breadcrumbs breadcrumbs={breadcrumbs}/>
                </div>
                <div className="flex gap-4 items-center">
                    <Button
                        variant="ghost" size="icon"
                        className="shrink-0 cursor-pointer"
                        onClick={() => updateAppearance(appearance === 'light' ? 'dark' : 'light')}
                    >
                        {appearance === 'light' ? (
                            <Icon iconNode={Moon} className="h-2 w-2" />
                        ) : (
                            <Icon iconNode={Sun} className="h-2 w-2 text-white" />
                        )}
                    </Button>
                    <NavUser />
                </div>
            </div>
        </header>
    );
}

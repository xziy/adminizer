// import { NavFooter } from '@/components/nav-footer';
import {NavMain} from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import {type SharedData} from '@/types';
import {Link, usePage} from '@inertiajs/react';
// import { BookOpen, Folder, LayoutGrid } from 'lucide-react';
import MaterialIcon from "@/components/material-icon.tsx";


// const footerNavItems: NavItem[] = [
//     {
//         title: 'Repository',
//         href: 'https://github.com/laravel/react-starter-kit',
//         icon: Folder,
//     },
//     {
//         title: 'Documentation',
//         href: 'https://laravel.com/docs/starter-kits',
//         icon: BookOpen,
//     },
// ];

export function AppSidebar() {
    const page = usePage<SharedData>();
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem key={page.props.brand}>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: page.props.brand }}
                        >
                            <Link href={window.routePrefix} prefetch className="hover:bg-transparent active:bg-transparent">
                                <MaterialIcon name="rocket_launch" className="!text-[18px]"/>
                                <span>{page.props.brand}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={page.props.menu}/>
            </SidebarContent>

            <SidebarFooter>
                {/*<NavFooter items={footerNavItems} className="mt-auto" />*/}
            </SidebarFooter>
        </Sidebar>
    );
}

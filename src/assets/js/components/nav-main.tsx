import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {type NavItem, SharedData} from '@/types';
import { Link, usePage } from '@inertiajs/react';
import MaterialIcon from "@/components/material-icon.tsx";

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild isActive={item.link === page.url}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.link} prefetch>
                                <MaterialIcon name={item.icon} className="!text-[18px]" />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

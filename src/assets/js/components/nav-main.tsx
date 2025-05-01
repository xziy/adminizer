import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import {type NavItem, SharedData} from '@/types';
import {Link, usePage} from '@inertiajs/react';
import MaterialIcon from "@/components/material-icon.tsx";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible.tsx";
import {ChevronRight} from "lucide-react";

export function NavMain({items = []}: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    // Function to normalize URLs by removing query parameters and trailing slashes
    const normalizeUrl = (url: string) => {
        // Remove query parameters
        const withoutQuery = url.split('?')[0];
        // Remove trailing slash
        return withoutQuery.replace(/\/$/, '');
    };

    // Function to check if a menu item should be active
    const isActiveItem = (itemLink: string) => {
        const currentUrl = normalizeUrl(page.url);
        const normalizedItemLink = normalizeUrl(itemLink);

        // Check for exact match or if current URL starts with the item's URL
        return currentUrl === normalizedItemLink ||
            currentUrl.startsWith(`${normalizedItemLink}/`);
    };
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items && items.map((item) => (
                    item.actions?.length > 0 ? (
                            <Collapsible
                                key={item.title}
                                asChild
                                defaultOpen={isActiveItem(item.link)}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={item.title}>
                                            <MaterialIcon name={item.icon} className="!text-[18px]"/>
                                            <span
                                                className="overflow-hidden text-ellipsis whitespace-nowrap">{item.title}</span>
                                            <ChevronRight
                                                className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"/>
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.actions?.map((subItem) => (
                                                <SidebarMenuSubItem key={subItem.id}>
                                                    <SidebarMenuSubButton asChild isActive={isActiveItem(subItem.link)}>
                                                        {subItem.type === 'blank' ? (
                                                            <a href={subItem.link} target="_blank"
                                                               rel="noopener noreferrer">
                                                                {subItem.icon && <MaterialIcon name={subItem.icon}
                                                                                               className="!text-[18px]"/>}
                                                                <span>{subItem.title}</span>
                                                            </a>
                                                        ) : (
                                                            <Link href={subItem.link}>
                                                                {subItem.icon && <MaterialIcon name={subItem.icon}
                                                                                               className="!text-[18px]"/>}
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        )}
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        ) :
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActiveItem(item.link)}
                                tooltip={{children: item.title}}
                            >
                                {item.type === 'blank' ? (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                                        {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]"/>}
                                        <span>{item.title}</span>
                                    </a>
                                ) : (
                                    <Link href={item.link}>
                                        {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]"/>}
                                        <span>{item.title}</span>
                                    </Link>
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

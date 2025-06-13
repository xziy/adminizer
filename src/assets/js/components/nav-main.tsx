import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import {type NavItem, SharedData} from '@/types';
import {Link, usePage} from '@inertiajs/react';
import {useState} from 'react';
import MaterialIcon from "@/components/material-icon.tsx";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible.tsx";
import {ChevronRight} from "lucide-react";

export function NavMain({items = []}: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    // Track open state for each section group
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        items.forEach(item => {
            const section = item.section || 'Platform';
            if (!(section in init)) {
                init[section] = true;
            }
        });
        return init;
    });
    // Function to normalize URLs by removing query parameters and trailing slashes
    const normalizeUrl = (url: string) => {
        // Remove query parameters
        const withoutQuery = url.split('?')[0];
        // Remove trailing slash
        return withoutQuery.replace(/\/$/, '');
    };
    // Group items by section (default 'Platform')
    const groupedItems = items.reduce((acc: Record<string, NavItem[]>, item) => {
        const section = item.section || 'Platform';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(item);
        return acc;
    }, {});

    // Menu entry component for individual items
    const MenuEntry = ({item}: {item: NavItem}) => (
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
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.title}</span>
                            <ChevronRight
                                className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.actions?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                    <SidebarMenuSubButton asChild isActive={isActiveItem(subItem.link)}>
                                        {subItem.type === 'blank' ? (
                                            <a href={subItem.link} target="_blank" rel="noopener noreferrer">
                                                {subItem.icon && (
                                                    <MaterialIcon name={subItem.icon} className="!text-[18px]"/>
                                                )}
                                                <span>{subItem.title}</span>
                                            </a>
                                        ) : (
                                            <Link href={subItem.link}>
                                                {subItem.icon && (
                                                    <MaterialIcon name={subItem.icon} className="!text-[18px]"/>
                                                )}
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
        ) : (
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
        )
    );

    // Function to check if a menu item should be active
    const isActiveItem = (itemLink: string) => {
        const currentUrl = normalizeUrl(page.url);
        const normalizedItemLink = normalizeUrl(itemLink);

        // Check for exact match or if current URL starts with the item's URL
        return currentUrl === normalizedItemLink ||
            currentUrl.startsWith(`${normalizedItemLink}/`);
    };
    return (
        <>
            {Object.entries(groupedItems).map(([section, itemsInSection]) => (
                <SidebarGroup key={section} className="px-2 py-0">
                    <SidebarGroupLabel
                        asChild
                        className="cursor-pointer"
                        onClick={() =>
                            setOpenGroups(prev => ({
                                ...prev,
                                [section]: !prev[section],
                            }))
                        }
                    >
                        <div className="flex items-center gap-1">
                            <ChevronRight
                                className={`transform transition-transform duration-200 ${
                                    openGroups[section] ? 'rotate-90' : ''
                                }`}
                            />
                            <span>{section}</span>
                        </div>
                    </SidebarGroupLabel>
                    {openGroups[section] && (
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {itemsInSection.map(item => (
                                    <MenuEntry item={item} key={item.id || item.title} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    )}
                </SidebarGroup>
            ))}
        </>
    );
}

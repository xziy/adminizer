// import { NavFooter } from '@/components/nav-footer';
import {NavMain} from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import {type SharedData} from '@/types';
import {Link, usePage} from '@inertiajs/react';
import MaterialIcon from "@/components/material-icon.tsx";
import {DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChevronRight, ChevronsUpDown} from "lucide-react";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";

type Section = {
    id: string
    title: string
    link: string
    icon: string
    subItems?: Section[]
}

interface MenuProps extends SharedData {
    section: Section[]
}

export function AppSidebar() {
    const page = usePage<MenuProps>();
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem key={page.props.brand}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" asChild className="cursor-pointer w-full">
                                    <div>
                                        <MaterialIcon name="rocket_launch" className="!text-[18px]"/>
                                        <span>{page.props.brand}</span>
                                        <ChevronsUpDown className="ml-auto"/>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-fit" side="right" align="start">
                                <DropdownMenuGroup className="grid gap-2">
                                    {page.props.section.map((itemSection) => (
                                        <div key={itemSection.id} className="px-2 space-y-2">
                                            {itemSection.subItems ?
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Link href={itemSection.link} onClick={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                              className="flex gap-2 items-center">
                                                            <MaterialIcon name={itemSection.icon}
                                                                          className="!text-[18px]"/>
                                                            <span className="hover:underline">{itemSection.title}</span>
                                                            <ChevronRight className="ml-auto size-4"/>
                                                        </Link>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-fit" side="right" align="start">
                                                        <DropdownMenuGroup className="grid gap-2">
                                                            {itemSection.subItems.map((subItem) => (
                                                                <Link href={subItem.link} key={subItem.id}
                                                                      className="flex gap-2 items-center">
                                                                    <MaterialIcon name={subItem.icon} className="!text-[18px]"/>
                                                                    <span className="hover:underline">{subItem.title}</span>
                                                                </Link>
                                                            ))}
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                :
                                                <Link href={itemSection.link}
                                                      className="flex gap-2 items-center">
                                                    <MaterialIcon name={itemSection.icon} className="!text-[18px]"/>
                                                    <span className="hover:underline">{itemSection.title}</span>
                                                </Link>
                                            }
                                        </div>
                                    )) || null}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
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

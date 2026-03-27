'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Bot, CreditCard, FileText, FolderKanban, GitBranch, LayoutDashboard, Presentation } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Q&A', url: '/qa', icon: Bot },
  { title: 'Meetings', url: '/meetings', icon: Presentation },
  { title: 'Projects', url: '/projects', icon: FolderKanban },
  { title: 'Billing', url: '/billing', icon: CreditCard },
  { title: 'Repo Explorer', url: '/aimodels', icon: GitBranch },
  { title: 'Doc Summarizer', url: '/docsummarizer', icon: FileText },
  { title: 'Code Health', url: '/health', icon: Activity },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden">
            GitMind
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
              <UserButton />
              <span className="text-sm truncate group-data-[collapsible=icon]:hidden">
                Account
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

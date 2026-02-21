'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, CreditCard, FileText, GitBranch, LayoutDashboard, Plus, Presentation } from 'lucide-react'
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
import { useProject } from '@/hooks/use-project'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Q&A', url: '/qa', icon: Bot },
  { title: 'Meetings', url: '/meetings', icon: Presentation },
  { title: 'Billing', url: '/billing', icon: CreditCard },
  { title: 'Repo Explorer', url: '/aimodels', icon: GitBranch },
  { title: 'Doc Summarizer', url: '/docsummarizer', icon: FileText },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { projects, projectId, setProjectId } = useProject()

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
        {/* Main Navigation */}
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

        {/* Projects */}
        <SidebarGroup>
          <SidebarGroupLabel>Your Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={projectId === project.id}
                    onClick={() => setProjectId(project.id)}
                    tooltip={project.name}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-sm border text-xs font-semibold',
                        projectId === project.id
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-white border-sidebar-border text-sidebar-foreground'
                      )}
                    >
                      {project.name[0]?.toUpperCase()}
                    </div>
                    <span>{project.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <Link href="/create">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1 group-data-[collapsible=icon]:hidden"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Create Project
                  </Button>
                </Link>
              </SidebarMenuItem>
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

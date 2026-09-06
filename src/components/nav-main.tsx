import { Link } from "@tanstack/react-router";
import {
  BellIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  ListIcon,
  UserIcon,
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isAdminRole, type Organisation, type User } from "@/lib/types";

export function NavMain({
  user,
}: {
  user: User & { organisation: Organisation };
}) {
  const isAdmin = isAdminRole(user.role);

  // Include the org name in the mailto subject so support can identify the
  // tenant without asking. `encodeURIComponent` handles spaces / punctuation.
  const helpHref = `mailto:help@energy-i.ai?subject=${encodeURIComponent(
    `Energy-i Support — ${user.organisation.name}`,
  )}`;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <LayoutDashboardIcon />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/sites">
                <ListIcon />
                <span>Sites</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/alerts" search={{ view: "active" }}>
                <BellIcon />
                <span>Alerts</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/users">
                  <UserIcon />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={helpHref}>
                <LifeBuoyIcon />
                <span>Help</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

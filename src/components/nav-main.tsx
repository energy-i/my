import { useQuery } from "@tanstack/react-query";
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
import { getOrganisation } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { isAdminRole, type Organisation, type User } from "@/lib/types";

export function NavMain({
  user,
}: {
  user: User & { organisation: Organisation };
}) {
  const isAdmin = isAdminRole(user.role);
  const { data: organisation } = useQuery({
    queryKey: queryKeys.organisation,
    queryFn: getOrganisation,
  });
  const hasAlertsAccess =
    user.organisation.hasAlertsAccess ||
    organisation?.sites.some((site) => site.tier === "OPTIMISE") === true;

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
          {hasAlertsAccess ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/alerts" search={{ view: "active" }}>
                  <BellIcon />
                  <span>Alerts</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
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

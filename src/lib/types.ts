// Types mirroring the platform API (`apps/api`) response shapes. Kept as a
// small, hand-maintained subset because the web-app no longer depends on
// Prisma-generated types.

export type Organisation = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRole = "OWNER" | "ADMIN" | "USER";

// Roles that grant administrative access to org-scoped UI (matches the API's
// `ADMIN_ROLES` set — see `apps/api/src/middleware/auth.ts`).
export const ADMIN_ROLES: readonly UserRole[] = ["OWNER", "ADMIN"];

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role);
}

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  role: UserRole | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
};

export type UserWithOrganisation = User & { organisation: Organisation };

export type MeterType = "SMETS2" | "SMETS1" | "LEGACY" | "SUB";

export type Site = {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  postcode: string;
  sector: string | null;
  latitude: number | null;
  longitude: number | null;
  area: number | null;
  eac: number | null;
  commsVendor: string | null;
  commsId: string | null;
  meterType: MeterType | null;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  tariffId: string | null;
};

export type Area = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  siteId: string;
  _count: { appliances: number };
};

export type OrganisationWithSites = Organisation & { sites: Site[] };
export type OrganisationWithUsers = Organisation & { users: User[] };

export type ConsumptionScope = "site" | "area" | "appliance";
export type ConsumptionInterval = "halfHour" | "hour" | "day" | "month";

export type ConsumptionPoint = {
  timestamp: string;
  value: number;
};

export type ConsumptionBreakdownItem = {
  id: string;
  name: string;
  total: number;
  series: ConsumptionPoint[];
};

export type Consumption = {
  scope: ConsumptionScope;
  id: string;
  from: string;
  to: string;
  interval: ConsumptionInterval;
  unit: string;
  breakdown: ConsumptionBreakdownItem[];
};

export type AlertType = "ALERT" | "OPPORTUNITY" | "INSIGHT";

export type OfficeHoursEntry = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  siteId: string;
};

export type Tariff = {
  id: string;
  name: string;
  provider: string | null;
  unitRate: number | string | null;
  standingCharge: number | string | null;
  createdAt: string;
  updatedAt: string;
};

export type SiteAlert = {
  id: string;
  title: string;
  description: string;
  type: AlertType;
  snoozedUntil: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
  siteId: string;
};

export type SiteAlertWithSite = SiteAlert & {
  site: { id: string; name: string };
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SiteListItem = Site & {
  _count: { areas: number; appliances: number; alerts: number };
};

export type PaginatedSites = {
  sites: SiteListItem[];
  pagination: Pagination;
};

export type PaginatedAlerts = {
  alerts: SiteAlertWithSite[];
  pagination: Pagination;
};

export type PaginatedSiteAlerts = {
  alerts: SiteAlert[];
  pagination: Pagination;
};

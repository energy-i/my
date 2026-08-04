import type {
  AlertType,
  Area,
  Consumption,
  ConsumptionInterval,
  OfficeHoursEntry,
  OrganisationWithSites,
  OrganisationWithUsers,
  PaginatedAlerts,
  PaginatedSiteAlerts,
  PaginatedSites,
  Site,
  SiteAlertWithSite,
  Tariff,
  User,
  UserRole,
  UserWithOrganisation,
} from "./types";

// Base URL of the platform API (Hono). In dev the browser hits same-origin
// `/api/*` which Vite proxies to `${API_BASE_URL}/*`. In production set
// VITE_API_BASE_URL to the API's public URL (e.g. https://api.example.com/v1)
// — that origin must send CORS headers and support cross-site cookies.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body && typeof body === "object" && "message" in body) {
        message = String((body as { message?: unknown }).message ?? message);
      }
    } catch {
      // ignore JSON parse failures
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function getMe(): Promise<UserWithOrganisation | null> {
  try {
    const { user } = await apiFetch<{ user: UserWithOrganisation }>("/me");
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function getOrganisation(): Promise<OrganisationWithSites> {
  const { organisation } = await apiFetch<{
    organisation: OrganisationWithSites;
  }>("/organisation");
  return organisation;
}

export async function getOrganisationUsers(): Promise<OrganisationWithUsers> {
  const { organisation } = await apiFetch<{
    organisation: OrganisationWithUsers;
  }>("/organisation/users");
  return organisation;
}

export type SitesListParams = {
  page?: number;
  pageSize?: number;
  sortBy?:
    | "name"
    | "city"
    | "postcode"
    | "sector"
    | "area"
    | "eac"
    | "createdAt"
    | "updatedAt";
  sortDir?: "asc" | "desc";
};

export async function getSites(
  params: SitesListParams = {},
): Promise<PaginatedSites> {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.pageSize !== undefined)
    search.set("pageSize", String(params.pageSize));
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();

  return apiFetch<PaginatedSites>(`/sites${qs ? `?${qs}` : ""}`);
}

export async function getSite(id: string): Promise<Site | null> {
  try {
    const { site } = await apiFetch<{ site: Site }>(`/sites/${id}`);
    return site;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getSiteAreas(id: string): Promise<Area[]> {
  const { areas } = await apiFetch<{ areas: Area[] }>(`/sites/${id}/areas`);
  return areas;
}

export async function getSiteConsumption(
  id: string,
  params: { from: string; to: string; interval?: ConsumptionInterval },
): Promise<Consumption> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    interval: params.interval ?? "day",
  });
  const { consumption } = await apiFetch<{ consumption: Consumption }>(
    `/sites/${id}/consumption?${search.toString()}`,
  );
  return consumption;
}

export async function getAreaConsumption(
  id: string,
  params: { from: string; to: string; interval?: ConsumptionInterval },
): Promise<Consumption> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    interval: params.interval ?? "day",
  });
  const { consumption } = await apiFetch<{ consumption: Consumption }>(
    `/areas/${id}/consumption?${search.toString()}`,
  );
  return consumption;
}

export async function getSiteAlerts(
  siteId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedSiteAlerts> {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.pageSize !== undefined)
    search.set("pageSize", String(params.pageSize));
  const qs = search.toString();

  return apiFetch<PaginatedSiteAlerts>(
    `/sites/${siteId}/alerts${qs ? `?${qs}` : ""}`,
  );
}

export async function getAlerts(
  params: {
    includeSnoozed?: boolean;
    includeDismissed?: boolean;
    snoozedOnly?: boolean;
    type?: AlertType[];
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedAlerts> {
  const search = new URLSearchParams();
  if (params.includeSnoozed) search.set("includeSnoozed", "true");
  if (params.includeDismissed) search.set("includeDismissed", "true");
  if (params.snoozedOnly) search.set("snoozedOnly", "true");
  if (params.type && params.type.length > 0) {
    search.set("type", params.type.join(","));
  }
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.pageSize !== undefined)
    search.set("pageSize", String(params.pageSize));
  const qs = search.toString();

  return apiFetch<PaginatedAlerts>(`/alerts${qs ? `?${qs}` : ""}`);
}

export type SiteInput = {
  name: string;
  addressLine1: string;
  city: string;
  postcode: string;
  sector?: string | null;
  area?: number | null;
  eac?: number | null;
};

export async function createSite(data: SiteInput): Promise<Site> {
  const { site } = await apiFetch<{ site: Site }>("/sites", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return site;
}

export async function updateSite(id: string, data: SiteInput): Promise<Site> {
  const { site } = await apiFetch<{ site: Site }>(`/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return site;
}

export async function createUser(data: {
  name: string;
  email: string;
}): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return user;
}

export async function updateUser(
  id: string,
  data: { role: UserRole },
): Promise<User> {
  const { user } = await apiFetch<{ user: User }>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export type AlertPatch = {
  snoozedUntil?: string | null;
  dismissedAt?: string | null;
};

export async function patchAlert(
  id: string,
  data: AlertPatch,
): Promise<SiteAlertWithSite> {
  const { alert } = await apiFetch<{ alert: SiteAlertWithSite }>(
    `/alerts/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
  return alert;
}

export async function getSiteTariff(siteId: string): Promise<Tariff | null> {
  try {
    const { tariff } = await apiFetch<{ tariff: Tariff }>(
      `/sites/${siteId}/tariff`,
    );
    return tariff;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getSiteOfficeHours(
  siteId: string,
): Promise<OfficeHoursEntry[]> {
  try {
    const { officeHours } = await apiFetch<{ officeHours: OfficeHoursEntry[] }>(
      `/sites/${siteId}/office-hours`,
    );
    return officeHours;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

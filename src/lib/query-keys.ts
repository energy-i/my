export const queryKeys = {
  me: ["me"] as const,
  organisation: ["organisation"] as const,
  organisationUsers: ["organisation", "users"] as const,
  sites: ["sites"] as const,
  sitesList: (params: {
    page: number;
    pageSize: number;
    sortBy: string;
    sortDir: "asc" | "desc";
  }) => ["sites", "list", params] as const,
  site: (id: string) => ["sites", id] as const,
  siteAreas: (id: string) => ["sites", id, "areas"] as const,
  siteAlerts: (id: string, params: { page: number; pageSize: number }) =>
    ["sites", id, "alerts", params] as const,
  siteConsumption: (id: string, range: string) =>
    ["sites", id, "consumption", range] as const,
  siteTariff: (id: string) => ["sites", id, "tariff"] as const,
  siteOfficeHours: (id: string) => ["sites", id, "office-hours"] as const,
  areaConsumption: (id: string, range: string) =>
    ["areas", id, "consumption", range] as const,
  alerts: (params: {
    view: "active" | "snoozed";
    page: number;
    pageSize: number;
    type: string[];
  }) => ["alerts", params] as const,
};

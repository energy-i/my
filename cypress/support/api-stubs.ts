/// <reference types="cypress" />

// -----------------------------------------------------------------------------
// Fixture data and in-memory state
// -----------------------------------------------------------------------------

const NOW = "2026-01-01T00:00:00.000Z";

const ORG = {
  id: "org-1",
  name: "Energy Corp",
  email: null as string | null,
  address: null as string | null,
  createdAt: NOW,
  updatedAt: NOW,
};

const ADMIN_USER = {
  id: "user-admin",
  name: "Admin User",
  email: "admin@energycorp.com",
  emailVerified: true,
  image: null,
  createdAt: NOW,
  updatedAt: NOW,
  organisationId: ORG.id,
  role: "OWNER",
  banned: false,
  banReason: null,
  banExpires: null,
};

const SITE_ID = "11111111-1111-1111-1111-111111111111";
const AREA_ID = "22222222-2222-2222-2222-222222222222";

type Site = {
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
  meterType: string | null;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  tariffId: string | null;
};

type State = {
  sites: Site[];
};

let state: State;

function resetState() {
  state = {
    sites: [
      {
        id: SITE_ID,
        name: "Acme HQ",
        addressLine1: "1 Main Street",
        city: "London",
        postcode: "SW1A 1AA",
        sector: "Retail",
        latitude: null,
        longitude: null,
        area: 250,
        eac: 42000,
        meterType: null,
        createdAt: NOW,
        updatedAt: NOW,
        organisationId: ORG.id,
        tariffId: null,
      },
    ],
  };
}

function siteListItem(site: Site) {
  return {
    ...site,
    _count: { areas: 1, appliances: 3, alerts: 0 },
  };
}

// -----------------------------------------------------------------------------
// Intercept installation
// -----------------------------------------------------------------------------

export function installApiStubs(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, "");

  // The app can talk to the API via either an absolute base URL (built with
  // `VITE_API_BASE_URL`) or the same-origin `/api/*` prefix (dev proxy or
  // Vercel rewrite). Register every intercept for both prefixes so requests
  // never escape to the real backend regardless of build config.
  const prefixes = [base, "/api"].filter((p): p is string => Boolean(p));

  type Method = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  type Handler =
    Parameters<typeof cy.intercept>[1] | Parameters<typeof cy.intercept>[2];

  function stub(
    method: Method | null,
    path: string,
    handler: Handler,
    alias?: string,
  ) {
    for (const p of prefixes) {
      const url = `${p}${path}`;
      const chain = method
        ? cy.intercept(
            method,
            url,
            handler as Parameters<typeof cy.intercept>[2],
          )
        : cy.intercept(url, handler as Parameters<typeof cy.intercept>[1]);
      if (alias) chain.as(alias);
    }
  }

  resetState();

  // Catch-all first — later, more specific intercepts take precedence in
  // Cypress. Anything not stubbed explicitly still returns an empty 200 so
  // tests never hit the real API.
  stub(null, "/**", (req) => {
    req.reply({ statusCode: 200, body: {} });
  });

  // ---------------------------------------------------------------------------
  // Auth (Better Auth)
  // ---------------------------------------------------------------------------

  stub(
    "POST",
    "/auth/sign-in/email",
    (req) => {
      const { email, password } = (req.body ?? {}) as {
        email?: string;
        password?: string;
      };
      if (email === ADMIN_USER.email && password === "password") {
        req.reply({
          statusCode: 200,
          body: {
            redirect: false,
            token: "stub-session-token",
            user: ADMIN_USER,
          },
        });
      } else {
        req.reply({
          statusCode: 401,
          body: {
            code: "INVALID_EMAIL_OR_PASSWORD",
            message: "Invalid email or password",
          },
        });
      }
    },
    "signIn",
  );

  stub(
    "POST",
    "/auth/sign-up/email",
    (req) => {
      const { email, name } = (req.body ?? {}) as {
        email?: string;
        name?: string;
      };
      if (email === ADMIN_USER.email) {
        req.reply({
          statusCode: 422,
          body: {
            code: "USER_ALREADY_EXISTS",
            message: "A user with this email already exists",
          },
        });
        return;
      }
      req.reply({
        statusCode: 200,
        body: {
          token: "stub-session-token",
          user: {
            ...ADMIN_USER,
            id: "user-new",
            email: email ?? "new@example.com",
            name: name ?? "New User",
            emailVerified: false,
          },
        },
      });
    },
    "signUp",
  );

  stub(
    "POST",
    "/auth/sign-out",
    { statusCode: 200, body: { success: true } },
    "signOut",
  );

  // ---------------------------------------------------------------------------
  // Session / org
  // ---------------------------------------------------------------------------

  stub(
    "GET",
    "/me",
    { statusCode: 200, body: { user: { ...ADMIN_USER, organisation: ORG } } },
    "getMe",
  );

  stub(
    "GET",
    "/organisation",
    {
      statusCode: 200,
      body: { organisation: { ...ORG, sites: state.sites } },
    },
    "getOrganisation",
  );

  stub(
    "GET",
    "/organisation/users",
    {
      statusCode: 200,
      body: { organisation: { ...ORG, users: [ADMIN_USER] } },
    },
    "getOrganisationUsers",
  );

  // ---------------------------------------------------------------------------
  // Sites
  // ---------------------------------------------------------------------------

  stub(
    "GET",
    "/sites*",
    (req) => {
      const url = new URL(req.url);
      if (url.pathname.replace(/\/$/, "").endsWith("/sites")) {
        const sites = state.sites.map(siteListItem);
        req.reply({
          statusCode: 200,
          body: {
            sites,
            pagination: {
              page: 1,
              pageSize: 25,
              total: sites.length,
              totalPages: 1,
            },
          },
        });
      }
    },
    "getSites",
  );

  stub(
    "GET",
    "/sites/*",
    (req) => {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[parts.length - 2] !== "sites") return;
      const id = parts[parts.length - 1];
      const site = state.sites.find((s) => s.id === id);
      if (!site) {
        req.reply({ statusCode: 404, body: { message: "Not found" } });
      } else {
        req.reply({ statusCode: 200, body: { site } });
      }
    },
    "getSite",
  );

  stub(
    "PATCH",
    "/sites/*",
    (req) => {
      const url = new URL(req.url);
      const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
      const idx = state.sites.findIndex((s) => s.id === id);
      if (idx === -1) {
        req.reply({ statusCode: 404, body: { message: "Not found" } });
        return;
      }
      const patch = (req.body ?? {}) as Partial<Site>;
      state.sites[idx] = { ...state.sites[idx], ...patch, updatedAt: NOW };
      req.reply({ statusCode: 200, body: { site: state.sites[idx] } });
    },
    "updateSite",
  );

  stub(
    "POST",
    "/sites",
    (req) => {
      const body = (req.body ?? {}) as Partial<Site>;
      const created: Site = {
        id: `new-${Date.now()}`,
        name: body.name ?? "New Site",
        addressLine1: body.addressLine1 ?? "",
        city: body.city ?? "",
        postcode: body.postcode ?? "",
        sector: body.sector ?? null,
        latitude: null,
        longitude: null,
        area: body.area ?? null,
        eac: body.eac ?? null,
        meterType: null,
        createdAt: NOW,
        updatedAt: NOW,
        organisationId: ORG.id,
        tariffId: null,
      };
      state.sites.push(created);
      req.reply({ statusCode: 201, body: { site: created } });
    },
    "createSite",
  );

  stub(
    "GET",
    "/sites/*/areas",
    {
      statusCode: 200,
      body: {
        areas: [
          {
            id: AREA_ID,
            name: "Ground Floor",
            createdAt: NOW,
            updatedAt: NOW,
            siteId: SITE_ID,
            _count: { appliances: 3 },
          },
        ],
      },
    },
    "getSiteAreas",
  );

  stub(
    "GET",
    "/sites/*/alerts*",
    {
      statusCode: 200,
      body: {
        alerts: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      },
    },
    "getSiteAlerts",
  );

  stub(
    "GET",
    "/sites/*/consumption*",
    {
      statusCode: 200,
      body: {
        consumption: {
          scope: "site",
          id: SITE_ID,
          from: NOW,
          to: NOW,
          interval: "day",
          unit: "kWh",
          breakdown: [],
        },
      },
    },
    "getSiteConsumption",
  );

  stub(
    "GET",
    "/areas/*/consumption*",
    {
      statusCode: 200,
      body: {
        consumption: {
          scope: "area",
          id: AREA_ID,
          from: NOW,
          to: NOW,
          interval: "day",
          unit: "kWh",
          breakdown: [],
        },
      },
    },
    "getAreaConsumption",
  );

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  stub(
    "GET",
    "/alerts*",
    {
      statusCode: 200,
      body: {
        alerts: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      },
    },
    "getAlerts",
  );

  stub(
    "PATCH",
    "/alerts/*",
    (req) => {
      req.reply({
        statusCode: 200,
        body: { alert: { ...(req.body ?? {}), id: "alert-1" } },
      });
    },
    "patchAlert",
  );

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  stub(
    "POST",
    "/users",
    (req) => {
      req.reply({
        statusCode: 201,
        body: { user: { ...ADMIN_USER, ...(req.body ?? {}), id: "user-new" } },
      });
    },
    "createUser",
  );

  stub(
    "PATCH",
    "/users/*",
    (req) => {
      req.reply({
        statusCode: 200,
        body: { user: { ...ADMIN_USER, ...(req.body ?? {}) } },
      });
    },
    "updateUser",
  );

  stub("DELETE", "/users/*", { statusCode: 204, body: "" }, "deleteUser");
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  InfoIcon,
  ListIcon,
  MapIcon,
} from "lucide-react";
import * as React from "react";
import * as z from "zod";

import { SitesMap } from "@/components/sites-map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getOrganisation, getSites } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 25;

const SORT_FIELDS = [
  "name",
  "city",
  "postcode",
  "sector",
  "area",
  "eac",
  "createdAt",
  "updatedAt",
] as const;

type SortField = (typeof SORT_FIELDS)[number];
type SortDir = "asc" | "desc";

const DEFAULT_SORT_BY: SortField = "name";
const DEFAULT_SORT_DIR: SortDir = "asc";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).optional(),
  sortBy: z.enum(SORT_FIELDS).catch(DEFAULT_SORT_BY).optional(),
  sortDir: z.enum(["asc", "desc"]).catch(DEFAULT_SORT_DIR).optional(),
});

export const Route = createFileRoute("/_authed/sites/")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SitesPage,
});

function SitesPage() {
  const [view, setView] = React.useState<"table" | "map">("table");
  const {
    page = 1,
    sortBy = DEFAULT_SORT_BY,
    sortDir = DEFAULT_SORT_DIR,
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/sites/" });

  const { data } = useQuery({
    queryKey: queryKeys.sitesList({
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    }),
    queryFn: () => getSites({ page, pageSize: PAGE_SIZE, sortBy, sortDir }),
    placeholderData: keepPreviousData,
  });
  const { data: organisation } = useQuery({
    queryKey: queryKeys.organisation,
    queryFn: getOrganisation,
    enabled: view === "map",
  });

  const sites = data?.sites ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const currentPage = data?.pagination.page ?? page;

  const numberFormatter = new Intl.NumberFormat();
  const pageItems = getPageItems(currentPage, totalPages);

  // Toggle sort: same column flips direction, different column resets to asc.
  // Any sort change also resets to page 1.
  const handleSort = (field: SortField) => {
    const nextDir: SortDir =
      sortBy === field && sortDir === "asc" ? "desc" : "asc";
    navigate({
      search: (prev) => ({
        ...prev,
        page: undefined,
        sortBy: field === DEFAULT_SORT_BY ? undefined : field,
        sortDir:
          field === DEFAULT_SORT_BY && nextDir === DEFAULT_SORT_DIR
            ? undefined
            : nextDir,
      }),
    });
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbPage className="hidden md:block">Sites</BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 flex-col gap-4 p-4 pt-0 space-y-4">
        {sites.length > 0 ? (
          <>
            <div className="flex justify-end">
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => {
                  if (value === "table" || value === "map") setView(value);
                }}
                variant="outline"
                spacing={0}
                aria-label="Sites view"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="table" aria-label="Table view">
                      <ListIcon />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Table view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="map" aria-label="Map view">
                      <MapIcon />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Map view</TooltipContent>
                </Tooltip>
              </ToggleGroup>
            </div>
            {view === "map" ? (
              <SitesMap sites={organisation?.sites ?? sites} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortButton
                        field="name"
                        label="Site"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="city"
                        label="Location"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-center">Active alerts</TableHead>
                    <TableHead className="text-center">Areas</TableHead>
                    <TableHead className="text-center">Appliances</TableHead>
                    <TableHead className="text-center">
                      <SortButton
                        field="area"
                        label="Area (m²)"
                        align="end"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-center">
                      <SortButton
                        field="eac"
                        label="EAC (kWh)"
                        align="end"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <Link
                          to="/sites/$id"
                          params={{ id: site.id }}
                          className="font-medium text-md hover:underline"
                        >
                          {site.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>{site.city}</div>
                        <div className="text-muted-foreground text-xs">
                          {site.addressLine1}
                          {site.postcode && `, ${site.postcode}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {numberFormatter.format(site._count.alerts)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {numberFormatter.format(site._count.areas)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {numberFormatter.format(site._count.appliances)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {site.area !== null
                          ? numberFormatter.format(site.area)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {site.eac !== null
                          ? numberFormatter.format(site.eac)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {view === "table" && totalPages > 1 ? (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={currentPage <= 1}
                      className={
                        currentPage <= 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                        event.preventDefault();
                        if (currentPage <= 1) return;
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: currentPage - 1,
                          }),
                        });
                      }}
                    />
                  </PaginationItem>
                  {pageItems.map((item, index) =>
                    item === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          onClick={(
                            event: React.MouseEvent<HTMLAnchorElement>,
                          ) => {
                            event.preventDefault();
                            if (item === currentPage) return;
                            navigate({
                              search: (prev) => ({ ...prev, page: item }),
                            });
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={currentPage >= totalPages}
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                        event.preventDefault();
                        if (currentPage >= totalPages) return;
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: currentPage + 1,
                          }),
                        });
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </>
        ) : (
          <Alert>
            <InfoIcon />
            <AlertTitle>No sites available</AlertTitle>
            <AlertDescription>
              Your organisation does not have any sites set up yet. Please
              contact your administrator.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}

// Build a compact list of page numbers with ellipses for large page counts.
// Always shows first, last, current, and neighbours of current.
function getPageItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("ellipsis");

  items.push(total);
  return items;
}

function SortButton({
  field,
  label,
  align = "start",
  currentSortBy,
  currentSortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  align?: "start" | "end";
  currentSortBy: SortField;
  currentSortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSortBy === field;
  const Icon = !isActive
    ? ArrowUpDownIcon
    : currentSortDir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-sort={
        !isActive
          ? "none"
          : currentSortDir === "asc"
            ? "ascending"
            : "descending"
      }
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        align === "end" ? "flex-row-reverse" : ""
      } ${isActive ? "text-foreground" : ""}`}
    >
      {label}
      <Icon className={`size-3.5 ${isActive ? "opacity-100" : "opacity-50"}`} />
    </button>
  );
}

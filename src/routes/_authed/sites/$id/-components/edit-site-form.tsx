import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "@posthog/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type SiteInput, updateSite } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Site } from "@/lib/types";

const optionalNumber = z
  .union([z.literal(""), z.coerce.number()])
  .transform((value) => (value === "" ? null : value))
  .nullable();

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  sector: z.string().optional(),
  area: optionalNumber,
  eac: optionalNumber,
});

type FormValues = z.input<typeof formSchema>;
type ParsedValues = z.output<typeof formSchema>;

const EditSiteForm = ({ site }: { site: Site }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: site.name,
      addressLine1: site.addressLine1,
      city: site.city,
      postcode: site.postcode,
      sector: site.sector ?? "",
      area: site.area ?? "",
      eac: site.eac ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: SiteInput) => updateSite(site.id, data),
    onSuccess: async () => {
      if (posthog) {
        posthog.capture("site_edited", {
          site_id: site.id,
          site_name: site.name,
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.sites });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.site(site.id),
      });
      navigate({ to: "/sites/$id", params: { id: site.id } });
    },
    onError: (error) => {
      toast.error("Failed to update site", {
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    },
  });

  const onSubmit = (data: ParsedValues) =>
    mutation.mutate({
      name: data.name,
      addressLine1: data.addressLine1,
      city: data.city,
      postcode: data.postcode,
      sector: data.sector || null,
      area: data.area,
      eac: data.eac,
    });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                {...field}
                placeholder="Head office"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="addressLine1"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="addressLine1">Address</FieldLabel>
              <Input
                id="addressLine1"
                type="text"
                {...field}
                placeholder="123 Example Street"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-7 md:grid-cols-2">
          <Controller
            name="city"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input id="city" type="text" {...field} placeholder="London" />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="postcode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="postcode">Postcode</FieldLabel>
                <Input
                  id="postcode"
                  type="text"
                  {...field}
                  placeholder="SW1A 1AA"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
        <Controller
          name="sector"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sector">Sector</FieldLabel>
              <Input
                id="sector"
                type="text"
                {...field}
                placeholder="e.g. Retail, Office, Industrial"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-7 md:grid-cols-2">
          <Controller
            name="area"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="area">Floor area (m²)</FieldLabel>
                <Input
                  id="area"
                  type="number"
                  step="any"
                  value={(field.value as number | "" | null) ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="500"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="eac"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="eac">
                  Estimated annual consumption (kWh)
                </FieldLabel>
                <Input
                  id="eac"
                  type="number"
                  step="any"
                  value={(field.value as number | "" | null) ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="25000"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: "/sites/$id", params: { id: site.id } })
            }
          >
            Cancel
          </Button>
          <Button disabled={mutation.isPending} type="submit">
            Save changes
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};

export default EditSiteForm;

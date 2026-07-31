# Admin Tournament Soft Delete Design

## Goal

Allow site administrators to soft-delete active or archived tournaments, browse
deleted tournaments in a dedicated admin-only tab, and open their existing
detail pages without exposing deleted tournament data to other users.

## Authorization

- Only users whose site role is `admin` may soft-delete a tournament.
- Tournament creators retain update access but no longer receive tournament
  delete permission.
- Active and archived tournament reads remain public.
- Deleted tournament lists, detail data, and child resources are returned only
  when the authenticated viewer is an administrator.
- A non-admin or anonymous request for a deleted tournament returns the same
  not-found response as an unknown tournament.

Public tournament read endpoints use optional JWT authentication. A valid token
adds the viewer to the request; a missing token keeps the request anonymous.
The backend remains the source of truth for every admin check.

## Backend behavior

The existing `deleted_at` column and `DELETE /tournaments/:id` endpoint remain
the soft-delete mechanism, so no database migration is required.

- `FindTournamentsDto.status` gains `deleted`.
- `active` selects rows with neither `archived_at` nor `deleted_at`.
- `archived` selects rows with `archived_at` and without `deleted_at`.
- `deleted` selects rows with `deleted_at`, regardless of archive state, and
  requires an administrator.
- Tournament detail and the child reads used by the existing detail page accept
  deleted rows only for an administrator.
- Soft delete accepts both active and archived rows, sets `deleted_at` once, and
  continues returning not found for an already deleted or unknown tournament.
- Deleted tournaments are read-only. Existing mutation policy resolution keeps
  rejecting deleted tournament subjects.

## Frontend behavior

`/events` continues using the existing status-tab and pagination flow.

- Administrators see a third **Deleted Tournaments** tab backed by
  `?status=deleted`.
- Anonymous and non-admin viewers see only Active and Archived. A manually
  supplied `status=deleted` does not load deleted data.
- Deleted cards link to the normal `/events/:id` route.
- The detail page retains its existing tabs and content, adds a visible
  **Deleted** state label, and hides registration, edit, and other mutation
  controls.
- The normal tournament detail page shows **Delete tournament** only to
  administrators for both active and archived tournaments. The action uses a
  destructive confirmation dialog.
- After a successful delete, the administrator is redirected to
  `/events?status=deleted&mode=all`.

## Errors and security

- Direct backend requests cannot bypass the frontend's hidden tab or controls.
- Requests for the deleted list without administrator authorization are
  forbidden and contain no tournament data.
- Requests for a specific deleted tournament or its child data by a non-admin
  return not found, concealing whether the tournament exists.
- Backend action failures use the existing status and message mapping in the
  frontend action.

## Verification

- Backend service tests cover active, archived, and deleted filters and
  soft-deleting an archived tournament.
- Policy tests prove that only administrators can delete tournaments.
- Controller/read tests prove deleted list and detail access is admin-only and
  anonymous reads still work for active and archived tournaments.
- Frontend server-load tests cover the admin-only Deleted tab/query and prevent
  non-admin `status=deleted` access.
- Frontend action tests cover the admin soft-delete redirect and rejection of a
  non-admin action.
- The generated API client is refreshed from the updated OpenAPI schema.

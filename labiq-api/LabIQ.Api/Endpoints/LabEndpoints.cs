using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class LabEndpoints
{
    public static void MapLabEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/labs", async (LabIqDbContext db) =>
        {
            // Load into memory so enum ordering uses int values, not alphabetical string sort
            var labs = await db.Labs
                .Include(l => l.Locations)
                .OrderBy(l => l.LegalName)
                .ToListAsync();

            return Results.Ok(labs.Select(l => new
            {
                l.LabId,
                l.LabCompanyCode,
                l.LegalName,
                l.PrimaryAddress,
                l.PrimaryContact,
                l.AccreditationBody,
                l.AccreditationNumber,
                l.SourceLims,
                l.CreatedAtUtc,
                LocationCount = l.Locations.Count,
                PrimaryStatus = l.Locations.Any()
                    ? l.Locations.Max(loc => loc.Status).ToString()   // Max on enum = highest int value
                    : "Draft"
            }));
        });

        app.MapGet("/api/labs/{id:int}", async (int id, LabIqDbContext db) =>
        {
            var lab = await db.Labs
                .Include(l => l.Locations)
                .FirstOrDefaultAsync(l => l.LabId == id);
            return lab is null ? Results.NotFound() : Results.Ok(new
            {
                lab.LabId,
                lab.LabCompanyCode,
                lab.LegalName,
                lab.PrimaryAddress,
                lab.PrimaryContact,
                lab.AccreditationBody,
                lab.AccreditationNumber,
                lab.SourceLims,
                lab.CreatedAtUtc,
                Locations = lab.Locations.Select(loc => new
                {
                    loc.LocationId,
                    loc.LabLocationCode,
                    loc.Address,
                    loc.TimeZone,
                    loc.AvailableFrom,
                    Status = loc.Status.ToString()
                })
            });
        });

        app.MapPost("/api/labs", async (CreateLabRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            if (await db.Labs.AnyAsync(l => l.LabCompanyCode == req.LabCompanyCode))
                return Results.Conflict(new { error = $"Lab code '{req.LabCompanyCode}' already exists" });

            var lab = new Lab
            {
                LabCompanyCode = req.LabCompanyCode.ToUpperInvariant(),
                LegalName = req.LegalName,
                PrimaryAddress = req.PrimaryAddress,
                PrimaryContact = req.PrimaryContact,
                AccreditationBody = req.AccreditationBody,
                AccreditationNumber = req.AccreditationNumber,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Labs.Add(lab);
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("LAB_CREATED", actor, "SureTrendAdmin", "Lab", lab.LabId.ToString(), lab.LabId, reason: req.Reason);

            return Results.Created($"/api/labs/{lab.LabId}", new { lab.LabId, lab.LabCompanyCode, lab.LegalName });
        });

        app.MapPost("/api/labs/{id:int}/locations", async (int id, CreateLocationRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var lab = await db.Labs.FindAsync(id);
            if (lab is null) return Results.NotFound();

            if (await db.LabLocations.AnyAsync(l => l.LabId == id && l.LabLocationCode == req.LabLocationCode))
                return Results.Conflict(new { error = $"Location code '{req.LabLocationCode}' already exists for this lab" });

            var location = new LabLocation
            {
                LabId = id,
                LabLocationCode = req.LabLocationCode.ToUpperInvariant(),
                Address = req.Address,
                TimeZone = req.TimeZone,
                AvailableFrom = req.AvailableFrom.ToUniversalTime(),
                Status = LabLifecycleState.Draft,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.LabLocations.Add(location);
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("LOCATION_CREATED", actor, "LabAdmin", "LabLocation", location.LocationId.ToString(), id, location.LocationId);

            return Results.Created($"/api/labs/{id}/locations/{location.LocationId}", new { location.LocationId, location.LabLocationCode, Status = location.Status.ToString() });
        });

        app.MapPost("/api/labs/{labId:int}/locations/{locationId:int}/lifecycle", async (int labId, int locationId, TransitionRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var location = await db.LabLocations.FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            if (location is null) return Results.NotFound();

            if (!Enum.TryParse<LabLifecycleState>(req.TargetState, true, out var target))
                return Results.BadRequest(new { error = $"Unknown lifecycle state: {req.TargetState}" });

            if (!IsTransitionAllowed(location.Status, target))
                return Results.BadRequest(new { error = $"Transition from {location.Status} to {target} is not permitted" });

            if (string.IsNullOrWhiteSpace(req.Reason))
                return Results.BadRequest(new { error = "Reason is required for all lifecycle transitions" });

            // Gate: TestTransactionsConfirmed requires at least one validated test order
            if (target == LabLifecycleState.TestTransactionsConfirmed)
            {
                var hasValidated = await db.TestOrders
                    .AnyAsync(o => o.LocationId == locationId && o.Mode == "Test" && o.Status == "Validated");
                if (!hasValidated)
                    return Results.BadRequest(new { error = "Cannot confirm test transactions: no validated round-trip test order found for this location. Generate and validate a test order first." });
            }

            // Gate: Live requires at least one configured active transport channel
            if (target == LabLifecycleState.Live)
            {
                var hasChannel = await db.TransportChannels
                    .AnyAsync(c => c.LocationId == locationId && c.IsActive);
                if (!hasChannel)
                    return Results.BadRequest(new { error = "Cannot go Live: no active integration channel configured for this location. Configure at least one transport channel first." });
            }

            var before = location.Status.ToString();
            location.Status = target;
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("LIFECYCLE_TRANSITION", actor, "SureTrendAdmin", "LabLocation",
                locationId.ToString(), labId, locationId, req.Reason,
                beforeHash: before, afterHash: target.ToString());

            return Results.Ok(new { locationId, Status = target.ToString() });
        });

        // DELETE /api/labs/{id}
        app.MapDelete("/api/labs/{id:int}", async (int id, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var lab = await db.Labs
                .Include(l => l.Locations)
                .Include(l => l.TestCodes).ThenInclude(t => t.ParameterAssociations)
                .Include(l => l.TestCodes).ThenInclude(t => t.Descriptions)
                .Include(l => l.ParameterCodes).ThenInclude(p => p.Descriptions)
                .FirstOrDefaultAsync(l => l.LabId == id);
            if (lab is null) return Results.NotFound();

            // Block delete if any location is Live or has active orders
            var liveLocation = lab.Locations.FirstOrDefault(l =>
                l.Status == LabLifecycleState.Live || l.Status == LabLifecycleState.Suspended);
            if (liveLocation != null)
                return Results.BadRequest(new { error = $"Cannot delete: location {liveLocation.LabLocationCode} is {liveLocation.Status}. Deactivate all locations before deleting the lab." });

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";

            // Cascade: remove availability, associations, descriptions, then entities
            foreach (var tc in lab.TestCodes)
            {
                db.TestParameterAssociations.RemoveRange(tc.ParameterAssociations);
                db.TestDescriptions.RemoveRange(tc.Descriptions);
            }
            foreach (var pc in lab.ParameterCodes)
                db.ParameterDescriptions.RemoveRange(pc.Descriptions);

            var availabilities = await db.LocationTestAvailabilities
                .Where(a => lab.Locations.Select(l => l.LocationId).Contains(a.LocationId)).ToListAsync();
            db.LocationTestAvailabilities.RemoveRange(availabilities);

            db.TestCodes.RemoveRange(lab.TestCodes);
            db.ParameterCodes.RemoveRange(lab.ParameterCodes);
            db.LabLocations.RemoveRange(lab.Locations);
            db.Labs.Remove(lab);
            await db.SaveChangesAsync();

            await audit.LogAsync("LAB_DELETED", actor, "SureTrendAdmin", "Lab", id.ToString(), id, reason: $"Lab {lab.LabCompanyCode} deleted");
            return Results.NoContent();
        });

        // DELETE /api/labs/{labId}/locations/{locationId}
        app.MapDelete("/api/labs/{labId:int}/locations/{locationId:int}", async (int labId, int locationId, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var location = await db.LabLocations
                .FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            if (location is null) return Results.NotFound();

            if (location.Status == LabLifecycleState.Live || location.Status == LabLifecycleState.Suspended)
                return Results.BadRequest(new { error = $"Cannot delete a {location.Status} location. Suspend it first." });

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";

            var availabilities = await db.LocationTestAvailabilities.Where(a => a.LocationId == locationId).ToListAsync();
            db.LocationTestAvailabilities.RemoveRange(availabilities);
            db.LabLocations.Remove(location);
            await db.SaveChangesAsync();

            await audit.LogAsync("LOCATION_DELETED", actor, "SureTrendAdmin", "LabLocation", locationId.ToString(), labId, locationId, reason: $"Location {location.LabLocationCode} deleted");
            return Results.NoContent();
        });

        app.MapGet("/api/labs/{id:int}/audit", async (int id, LabIqDbContext db) =>
        {
            var events = await db.AuditEvents
                .Where(e => e.LabId == id)
                .OrderByDescending(e => e.TimestampUtc)
                .Take(100)
                .Select(e => new
                {
                    e.EventId,
                    e.EventType,
                    e.TimestampUtc,
                    e.ActorId,
                    e.ActorRole,
                    e.ObjectType,
                    e.ObjectId,
                    e.Reason
                })
                .ToListAsync();
            return Results.Ok(events);
        });
    }

    private static bool IsTransitionAllowed(LabLifecycleState from, LabLifecycleState to) =>
        (from, to) switch
        {
            (LabLifecycleState.Draft, LabLifecycleState.CatalogLoaded) => true,
            (LabLifecycleState.CatalogLoaded, LabLifecycleState.MappingConfirmed) => true,
            (LabLifecycleState.MappingConfirmed, LabLifecycleState.TestTransactionsConfirmed) => true,
            (LabLifecycleState.TestTransactionsConfirmed, LabLifecycleState.Live) => true,
            (LabLifecycleState.Live, LabLifecycleState.Suspended) => true,
            (LabLifecycleState.Suspended, LabLifecycleState.Live) => true,
            (LabLifecycleState.CatalogLoaded, LabLifecycleState.Draft) => true, // rejected mapping
            _ => false
        };
}

public record CreateLabRequest(
    string LabCompanyCode,
    string LegalName,
    string PrimaryAddress,
    string PrimaryContact,
    string? AccreditationBody,
    string? AccreditationNumber,
    string? Reason);

public record CreateLocationRequest(
    string LabLocationCode,
    string Address,
    string TimeZone,
    DateTime AvailableFrom);

public record TransitionRequest(string TargetState, string Reason);

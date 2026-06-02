using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class OfferingsEndpoints
{
    public static void MapOfferingsEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/labs/{labId}/locations/{locationId}/offerings
        app.MapGet("/api/labs/{labId:int}/locations/{locationId:int}/offerings", async (int labId, int locationId, LabIqDbContext db) =>
        {
            var loc = await db.LabLocations.FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            if (loc is null) return Results.NotFound();

            var allTests = await db.TestCodes
                .Include(t => t.Descriptions)
                .Where(t => t.LabId == labId)
                .OrderBy(t => t.Code)
                .ToListAsync();

            var offeredIds = await db.LocationTestAvailabilities
                .Where(a => a.LocationId == locationId)
                .Select(a => a.TestCodeId)
                .ToListAsync();
            var offeredSet = offeredIds.ToHashSet();

            return Results.Ok(allTests.Select(t => new
            {
                t.TestCodeId, t.Code,
                CurrentDescription = t.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                t.ActiveFlag,
                Offered = offeredSet.Contains(t.TestCodeId)
            }));
        });

        // POST /api/labs/{labId}/locations/{locationId}/offerings/{testCodeId}
        app.MapPost("/api/labs/{labId:int}/locations/{locationId:int}/offerings/{testCodeId:int}", async (int labId, int locationId, int testCodeId, LabIqDbContext db) =>
        {
            var loc = await db.LabLocations.FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            var tc  = await db.TestCodes.FirstOrDefaultAsync(t => t.LabId == labId && t.TestCodeId == testCodeId);
            if (loc is null || tc is null) return Results.NotFound();

            if (!await db.LocationTestAvailabilities.AnyAsync(a => a.LocationId == locationId && a.TestCodeId == testCodeId))
            {
                db.LocationTestAvailabilities.Add(new LocationTestAvailability { LocationId = locationId, TestCodeId = testCodeId });
                await db.SaveChangesAsync();
            }
            return Results.Ok();
        });

        // DELETE /api/labs/{labId}/locations/{locationId}/offerings/{testCodeId}
        app.MapDelete("/api/labs/{labId:int}/locations/{locationId:int}/offerings/{testCodeId:int}", async (int labId, int locationId, int testCodeId, LabIqDbContext db) =>
        {
            var offering = await db.LocationTestAvailabilities.FirstOrDefaultAsync(a => a.LocationId == locationId && a.TestCodeId == testCodeId);
            if (offering is null) return Results.NotFound();
            db.LocationTestAvailabilities.Remove(offering);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

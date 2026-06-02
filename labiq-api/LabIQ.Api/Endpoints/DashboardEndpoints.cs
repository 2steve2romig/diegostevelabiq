using LabIQ.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard", async (LabIqDbContext db) =>
        {
            var testCount    = await db.TestCodes.CountAsync();
            var orphanCount  = await db.TestCodes.CountAsync(t => !t.ParameterAssociations.Any());
            var analyteCount = await db.ParameterCodes.CountAsync();
            var labCount     = await db.Labs.CountAsync();
            var bridgeCount  = await db.TestParameterAssociations.CountAsync();
            var offeringCount= await db.LocationTestAvailabilities.CountAsync();

            var recentActivity = await db.AuditEvents
                .OrderByDescending(e => e.TimestampUtc)
                .Take(6)
                .Select(e => new { e.EventType, e.TimestampUtc, e.ActorId, e.ActorRole, e.ObjectType, e.Reason })
                .ToListAsync();

            var labCoverage = await db.Labs
                .Include(l => l.TestCodes)
                .Include(l => l.Locations).ThenInclude(loc => loc.TestAvailability)
                .Select(l => new
                {
                    l.LabCompanyCode,
                    l.LegalName,
                    Total    = l.TestCodes.Count,
                    Covered  = l.Locations.SelectMany(loc => loc.TestAvailability)
                                          .Select(a => a.TestCodeId).Distinct().Count(),
                    Status   = l.Locations.Any()
                                ? l.Locations.OrderByDescending(loc => (int)loc.Status).First().Status.ToString()
                                : "Draft"
                })
                .ToListAsync();

            return Results.Ok(new
            {
                MasterTestCount    = testCount,
                OrphanTestCount    = orphanCount,
                MasterAnalyteCount = analyteCount,
                ConnectedLabCount  = labCount,
                TestParameterBridges = bridgeCount,
                LabOfferingRows    = offeringCount,
                RecentActivity     = recentActivity,
                LabCoverage        = labCoverage
            });
        });
    }
}

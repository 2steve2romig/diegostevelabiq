using LabIQ.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace LabIQ.Api.Endpoints;

public static class AuditTrailEndpoints
{
    public static void MapAuditTrailEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/audit", async (LabIqDbContext db, string? eventType, string? search, int? labId, int? limit) =>
        {
            var take = limit ?? 200;
            var q = db.AuditEvents.AsQueryable();

            if (labId.HasValue)                        q = q.Where(e => e.LabId == labId.Value);
            if (!string.IsNullOrWhiteSpace(eventType)) q = q.Where(e => e.EventType == eventType);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                q = q.Where(e => (e.ActorId != null && e.ActorId.ToLower().Contains(s))
                               || (e.ObjectType != null && e.ObjectType.ToLower().Contains(s))
                               || (e.Reason != null && e.Reason.ToLower().Contains(s)));
            }

            var events = await q.OrderByDescending(e => e.TimestampUtc).Take(take)
                .Select(e => new {
                    e.EventId, e.EventType, e.TimestampUtc, e.ActorId, e.ActorRole,
                    e.LabId, e.LocationId, e.ObjectType, e.ObjectId,
                    e.BeforeStateHash, e.AfterStateHash, e.Reason
                })
                .ToListAsync();

            return Results.Ok(events);
        });

        app.MapGet("/api/audit/event-types", async (LabIqDbContext db) =>
        {
            var types = await db.AuditEvents.Select(e => e.EventType).Distinct().OrderBy(t => t).ToListAsync();
            return Results.Ok(types);
        });

        app.MapGet("/api/audit/export.csv", async (LabIqDbContext db, string? eventType, string? search, int? labId) =>
        {
            var q = db.AuditEvents.AsQueryable();
            if (labId.HasValue)                        q = q.Where(e => e.LabId == labId.Value);
            if (!string.IsNullOrWhiteSpace(eventType)) q = q.Where(e => e.EventType == eventType);
            if (!string.IsNullOrWhiteSpace(search))    { var s = search.ToLower(); q = q.Where(e => (e.ActorId ?? "").ToLower().Contains(s) || (e.Reason ?? "").ToLower().Contains(s)); }

            var events = await q.OrderByDescending(e => e.TimestampUtc).Take(5000).ToListAsync();
            var csv = new StringBuilder();
            csv.AppendLine("EventId,EventType,TimestampUtc,ActorId,ActorRole,LabId,LocationId,ObjectType,ObjectId,Before,After,Reason");
            foreach (var e in events)
                csv.AppendLine($"{e.EventId},{e.EventType},{e.TimestampUtc:O},{Esc(e.ActorId)},{Esc(e.ActorRole)},{e.LabId},{e.LocationId},{Esc(e.ObjectType)},{Esc(e.ObjectId)},{Esc(e.BeforeStateHash)},{Esc(e.AfterStateHash)},{Esc(e.Reason)}");

            return Results.File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"audit-export-{DateTime.UtcNow:yyyyMMddHHmm}.csv");
        });
    }

    private static string Esc(string? s) => s == null ? "" : s.Contains(',') ? $"\"{s.Replace("\"", "\"\"")}\"" : s;
}

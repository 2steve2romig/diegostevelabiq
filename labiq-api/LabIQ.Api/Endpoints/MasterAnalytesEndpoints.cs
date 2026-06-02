using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class MasterAnalytesEndpoints
{
    public static void MapMasterAnalytesEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/analytes", async (LabIqDbContext db, string? search, int? labId) =>
        {
            var q = db.ParameterCodes
                .Include(p => p.Descriptions)
                .Include(p => p.TestAssociations).ThenInclude(a => a.TestCode)
                .AsQueryable();

            if (labId.HasValue) q = q.Where(p => p.LabId == labId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                q = q.Where(p => p.Code.ToLower().Contains(s)
                    || p.Descriptions.Any(d => d.IsCurrent && d.Description.ToLower().Contains(s)));
            }

            var items = await q.OrderBy(p => p.Code).ToListAsync();
            return Results.Ok(items.Select(p => new
            {
                p.ParameterCodeId, p.Code, p.LabId, p.MethodCode, p.MethodName, p.DefaultUnit, p.DefaultResultType, p.ActiveFlag,
                CurrentDescription = p.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                UsedInTests = p.TestAssociations.Select(a => a.TestCode.Code).Distinct().ToList(),
                TestCount = p.TestAssociations.Select(a => a.TestCodeId).Distinct().Count()
            }));
        });

        app.MapPost("/api/analytes", async (CreateAnalyteRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            if (await db.ParameterCodes.AnyAsync(p => p.LabId == req.LabId && p.Code == req.Code))
                return Results.Conflict(new { error = $"Analyte code '{req.Code}' already exists" });

            var pc = new ParameterCode
            {
                LabId = req.LabId, Code = req.Code.ToUpper(),
                MethodCode = req.MethodCode ?? "", MethodName = req.MethodCode ?? "",
                DefaultUnit = req.DefaultUnit, DefaultResultType = req.DefaultResultType,
                ActiveFlag = true, CreatedAtUtc = DateTime.UtcNow,
                Descriptions = new List<ParameterDescription> { new() { Description = req.Description, EffectiveStart = DateTime.UtcNow, IsCurrent = true } }
            };
            db.ParameterCodes.Add(pc);
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("ANALYTE_CREATED", actor, "LabAdmin", "ParameterCode", pc.ParameterCodeId.ToString(), req.LabId);
            return Results.Created($"/api/analytes/{pc.ParameterCodeId}", new { pc.ParameterCodeId, pc.Code });
        });

        app.MapPut("/api/analytes/{id:int}", async (int id, UpdateAnalyteRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var pc = await db.ParameterCodes.Include(p => p.Descriptions).FirstOrDefaultAsync(p => p.ParameterCodeId == id);
            if (pc is null) return Results.NotFound();

            var now = DateTime.UtcNow;
            var current = pc.Descriptions.FirstOrDefault(d => d.IsCurrent);
            if (current is not null && current.Description != req.Description)
            {
                current.EffectiveEnd = now; current.IsCurrent = false;
                pc.Descriptions.Add(new ParameterDescription { Description = req.Description, EffectiveStart = now, IsCurrent = true });
            }
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("ANALYTE_UPDATED", actor, "LabAdmin", "ParameterCode", id.ToString(), pc.LabId, reason: req.Reason);
            return Results.Ok(new { pc.ParameterCodeId, pc.Code });
        });

        app.MapDelete("/api/analytes/{id:int}", async (int id, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var pc = await db.ParameterCodes.Include(p => p.TestAssociations).FirstOrDefaultAsync(p => p.ParameterCodeId == id);
            if (pc is null) return Results.NotFound();
            db.TestParameterAssociations.RemoveRange(pc.TestAssociations);
            db.ParameterCodes.Remove(pc);
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("ANALYTE_DELETED", actor, "LabAdmin", "ParameterCode", id.ToString(), pc.LabId);
            return Results.NoContent();
        });
    }
}

public record CreateAnalyteRequest(int LabId, string Code, string Description, string? MethodCode, string? DefaultUnit, string? DefaultResultType);
public record UpdateAnalyteRequest(string Description, string Reason);

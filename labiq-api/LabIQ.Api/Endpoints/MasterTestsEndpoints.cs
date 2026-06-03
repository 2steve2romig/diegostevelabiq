using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class MasterTestsEndpoints
{
    public static void MapMasterTestsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests", async (LabIqDbContext db, string? search, int? labId, string? filter) =>
        {
            var q = db.TestCodes
                .Include(t => t.Descriptions)
                .Include(t => t.ParameterAssociations).ThenInclude(a => a.ParameterCode).ThenInclude(p => p.Descriptions)
                .Include(t => t.Lab)
                .AsQueryable();

            if (labId.HasValue) q = q.Where(t => t.LabId == labId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                q = q.Where(t => t.Code.ToLower().Contains(s) || t.Descriptions.Any(d => d.IsCurrent && d.Description.ToLower().Contains(s)));
            }
            if (filter == "with")    q = q.Where(t => t.ParameterAssociations.Any());
            if (filter == "without") q = q.Where(t => !t.ParameterAssociations.Any());

            var tests = await q.OrderBy(t => t.Code).ToListAsync();
            return Results.Ok(tests.Select(t => new
            {
                t.TestCodeId, t.Code, t.ActiveFlag, t.LabId,
                t.Matrix, t.SampleSize, t.TestCategory,
                LabCode = t.Lab.LabCompanyCode,
                CurrentDescription = t.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                Parameters = t.ParameterAssociations.Select(a => new
                {
                    a.ParameterCode.ParameterCodeId, a.ParameterCode.Code,
                    CurrentDescription = a.ParameterCode.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                    a.ParameterCode.MethodCode, a.ParameterCode.MethodName,
                    a.ParameterCode.DefaultUnit, a.ParameterCode.DefaultResultType
                })
            }));
        });

        app.MapPost("/api/tests", async (CreateTestRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            if (await db.TestCodes.AnyAsync(t => t.LabId == req.LabId && t.Code == req.Code))
                return Results.Conflict(new { error = $"Test code '{req.Code}' already exists for this lab" });

            var tc = new TestCode
            {
                LabId = req.LabId, Code = req.Code.ToUpper(), ActiveFlag = true,
                Matrix = req.Matrix, SampleSize = req.SampleSize, TestCategory = req.TestCategory,
                CreatedAtUtc = DateTime.UtcNow,
                Descriptions = new List<TestDescription> { new() { Description = req.Description, EffectiveStart = DateTime.UtcNow, IsCurrent = true } }
            };
            db.TestCodes.Add(tc);
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("TEST_CREATED", actor, "LabAdmin", "TestCode", tc.TestCodeId.ToString(), req.LabId, reason: req.Description);
            return Results.Created($"/api/tests/{tc.TestCodeId}", new { tc.TestCodeId, tc.Code });
        });

        app.MapPut("/api/tests/{id:int}", async (int id, UpdateTestRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var tc = await db.TestCodes.Include(t => t.Descriptions).FirstOrDefaultAsync(t => t.TestCodeId == id);
            if (tc is null) return Results.NotFound();
            if (string.IsNullOrWhiteSpace(req.Reason)) return Results.BadRequest(new { error = "Reason is required" });

            var now = DateTime.UtcNow;
            var cur = tc.Descriptions.FirstOrDefault(d => d.IsCurrent);
            if (cur != null && cur.Description != req.Description)
            {
                cur.EffectiveEnd = now; cur.IsCurrent = false;
                tc.Descriptions.Add(new TestDescription { Description = req.Description, EffectiveStart = now, IsCurrent = true });
            }
            if (req.Matrix     != null) tc.Matrix      = req.Matrix;
            if (req.SampleSize != null) tc.SampleSize  = req.SampleSize;
            if (req.TestCategory != null) tc.TestCategory = req.TestCategory;
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("TEST_UPDATED", actor, "LabAdmin", "TestCode", id.ToString(), tc.LabId, reason: req.Reason);
            return Results.Ok(new { tc.TestCodeId, tc.Code });
        });

        app.MapDelete("/api/tests/{id:int}", async (int id, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var tc = await db.TestCodes.Include(t => t.ParameterAssociations).FirstOrDefaultAsync(t => t.TestCodeId == id);
            if (tc is null) return Results.NotFound();
            db.TestParameterAssociations.RemoveRange(tc.ParameterAssociations);
            db.TestCodes.Remove(tc);
            await db.SaveChangesAsync();
            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("TEST_DELETED", actor, "LabAdmin", "TestCode", id.ToString(), tc.LabId);
            return Results.NoContent();
        });

        app.MapPost("/api/tests/{id:int}/analytes", async (int id, LinkAnalyteRequest req, LabIqDbContext db) =>
        {
            var tc = await db.TestCodes.FindAsync(id);
            var pc = await db.ParameterCodes.FindAsync(req.ParameterCodeId);
            if (tc is null || pc is null) return Results.NotFound();
            if (await db.TestParameterAssociations.AnyAsync(a => a.TestCodeId == id && a.ParameterCodeId == req.ParameterCodeId))
                return Results.Conflict(new { error = "Already linked" });
            db.TestParameterAssociations.Add(new TestParameterAssociation { TestCodeId = id, ParameterCodeId = req.ParameterCodeId });
            await db.SaveChangesAsync();
            return Results.Created("", new { id, req.ParameterCodeId });
        });

        app.MapDelete("/api/tests/{id:int}/analytes/{paramId:int}", async (int id, int paramId, LabIqDbContext db) =>
        {
            var assoc = await db.TestParameterAssociations.FindAsync(id, paramId);
            if (assoc is null) return Results.NotFound();
            db.TestParameterAssociations.Remove(assoc);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public record CreateTestRequest(int LabId, string Code, string Description, string? Matrix, string? SampleSize, string? TestCategory);
public record UpdateTestRequest(string Description, string? Matrix, string? SampleSize, string? TestCategory, string Reason);
public record LinkAnalyteRequest(int ParameterCodeId);

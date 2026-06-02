using LabIQ.Api.Data;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/labs/{labId:int}/catalog", async (int labId, LabIqDbContext db) =>
        {
            var lab = await db.Labs.FindAsync(labId);
            if (lab is null) return Results.NotFound();

            var testCodes = await db.TestCodes
                .Include(t => t.Descriptions)
                .Include(t => t.ParameterAssociations)
                    .ThenInclude(a => a.ParameterCode)
                        .ThenInclude(p => p.Descriptions)
                .Where(t => t.LabId == labId)
                .OrderBy(t => t.Code)
                .ToListAsync();

            var result = testCodes.Select(t => new
            {
                t.TestCodeId,
                t.Code,
                CurrentDescription = t.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                t.ActiveFlag,
                ParameterCount = t.ParameterAssociations.Count,
                Parameters = t.ParameterAssociations.Select(a => new
                {
                    a.ParameterCode.ParameterCodeId,
                    a.ParameterCode.Code,
                    CurrentDescription = a.ParameterCode.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                    a.ParameterCode.MethodCode,
                    a.ParameterCode.MethodName,
                    a.ParameterCode.DefaultUnit,
                    a.ParameterCode.DefaultResultType
                })
            });

            return Results.Ok(result);
        });

        app.MapGet("/api/labs/{labId:int}/catalog/tests/{code}/history", async (int labId, string code, LabIqDbContext db) =>
        {
            var tc = await db.TestCodes
                .Include(t => t.Descriptions)
                .FirstOrDefaultAsync(t => t.LabId == labId && t.Code == code);

            if (tc is null) return Results.NotFound();

            var history = tc.Descriptions
                .OrderByDescending(d => d.EffectiveStart)
                .Select(d => new
                {
                    d.Description,
                    d.EffectiveStart,
                    d.EffectiveEnd,
                    d.IsCurrent
                });

            return Results.Ok(new { tc.Code, History = history });
        });

        app.MapGet("/api/labs/{labId:int}/catalog/parameters/{code}/history", async (int labId, string code, LabIqDbContext db) =>
        {
            var pc = await db.ParameterCodes
                .Include(p => p.Descriptions)
                .FirstOrDefaultAsync(p => p.LabId == labId && p.Code == code);

            if (pc is null) return Results.NotFound();

            var history = pc.Descriptions
                .OrderByDescending(d => d.EffectiveStart)
                .Select(d => new
                {
                    d.Description,
                    d.EffectiveStart,
                    d.EffectiveEnd,
                    d.IsCurrent
                });

            return Results.Ok(new { pc.Code, History = history });
        });

        app.MapPost("/api/labs/{labId:int}/catalog/upload", async (int labId, IFormFile file, LabIqDbContext db, CatalogIngestionService ingestion, HttpContext http) =>
        {
            var lab = await db.Labs.FindAsync(labId);
            if (lab is null) return Results.NotFound();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

            using var stream = file.OpenReadStream();
            var result = ext switch
            {
                ".csv" => await ingestion.IngestCsvAsync(labId, stream, actor),
                ".xlsx" or ".xls" => await ingestion.IngestXlsxAsync(labId, stream, actor),
                _ => null
            };

            if (result is null)
                return Results.BadRequest(new { error = "Unsupported file type. Use .csv or .xlsx" });

            return result.Success ? Results.Ok(result) : Results.UnprocessableEntity(result);
        });

        app.MapGet("/api/labs/{labId:int}/catalog/point-in-time", async (int labId, DateTime asOf, LabIqDbContext db) =>
        {
            var testCodes = await db.TestCodes
                .Include(t => t.Descriptions)
                .Include(t => t.ParameterAssociations)
                    .ThenInclude(a => a.ParameterCode)
                        .ThenInclude(p => p.Descriptions)
                .Where(t => t.LabId == labId)
                .OrderBy(t => t.Code)
                .ToListAsync();

            var asOfUtc = asOf.ToUniversalTime();

            var result = testCodes.Select(t => new
            {
                t.Code,
                Description = t.Descriptions
                    .Where(d => d.EffectiveStart <= asOfUtc && (d.EffectiveEnd == null || d.EffectiveEnd > asOfUtc))
                    .OrderByDescending(d => d.EffectiveStart)
                    .FirstOrDefault()?.Description,
                Parameters = t.ParameterAssociations.Select(a => new
                {
                    a.ParameterCode.Code,
                    Description = a.ParameterCode.Descriptions
                        .Where(d => d.EffectiveStart <= asOfUtc && (d.EffectiveEnd == null || d.EffectiveEnd > asOfUtc))
                        .OrderByDescending(d => d.EffectiveStart)
                        .FirstOrDefault()?.Description
                })
            });

            return Results.Ok(new { AsOf = asOfUtc, TestCodes = result });
        });
    }
}

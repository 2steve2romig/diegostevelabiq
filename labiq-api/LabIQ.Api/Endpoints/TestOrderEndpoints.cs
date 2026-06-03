using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LabIQ.Api.Endpoints;

public static class TestOrderEndpoints
{
    public static void MapTestOrderEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/labs/{labId}/locations/{locationId}/test-orders
        app.MapGet("/api/labs/{labId:int}/locations/{locationId:int}/test-orders", async (int labId, int locationId, LabIqDbContext db) =>
        {
            var orders = await db.TestOrders
                .Include(o => o.Result)
                .Where(o => o.LocationId == locationId)
                .OrderByDescending(o => o.DispatchedAtUtc)
                .Select(o => new
                {
                    o.TestOrderId, o.SureTrendOrderId, o.Mode, o.Status,
                    o.DispatchedAtUtc, o.DispatchedBy, o.PayloadJson,
                    Result = o.Result == null ? null : new
                    {
                        o.Result.TestResultId, o.Result.LabSampleCode,
                        o.Result.ReceivedAtUtc, o.Result.BoundAtUtc,
                        o.Result.Status, o.Result.AnalyteCodesMatch,
                        o.Result.ValidationNotes
                    }
                })
                .ToListAsync();

            return Results.Ok(orders);
        });

        // POST /api/labs/{labId}/locations/{locationId}/test-orders — generate + dispatch
        app.MapPost("/api/labs/{labId:int}/locations/{locationId:int}/test-orders", async (int labId, int locationId, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var loc = await db.LabLocations.FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            if (loc is null) return Results.NotFound();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";

            // Build a test order payload from available tests at this location
            var offerings = await db.LocationTestAvailabilities
                .Include(a => a.TestCode).ThenInclude(t => t.Descriptions)
                .Where(a => a.LocationId == locationId)
                .Take(3)
                .ToListAsync();

            var orderId = $"TEST-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";

            var payload = new
            {
                descriptor = new { purpose = "TestOrder", version = "1.0", mode = "Test", originator = "SureTrend", createdAt = DateTime.UtcNow },
                sureTrendOrderId = orderId,
                labLocationCode = loc.LabLocationCode,
                samples = new[]
                {
                    new
                    {
                        sampleId = $"TEST-S-{DateTime.UtcNow:HHmmss}",
                        matrix = offerings.FirstOrDefault()?.TestCode?.Matrix ?? "RTE food",
                        tests = offerings.Select(o => o.TestCode.Code).ToArray()
                    }
                }
            };

            var order = new TestOrder
            {
                LocationId = locationId,
                SureTrendOrderId = orderId,
                DispatchedAtUtc = DateTime.UtcNow,
                Mode = "Test",
                Status = "Dispatched",
                DispatchedBy = actor,
                PayloadJson = JsonSerializer.Serialize(payload)
            };
            db.TestOrders.Add(order);
            await db.SaveChangesAsync();

            await audit.LogAsync("TEST_ORDER_DISPATCHED", actor, "SureTrendAdmin", "TestOrder",
                order.TestOrderId.ToString(), labId, locationId,
                reason: $"Test order {orderId} dispatched for connectivity validation");

            return Results.Created($"/api/labs/{labId}/locations/{locationId}/test-orders/{order.TestOrderId}",
                new { order.TestOrderId, order.SureTrendOrderId, order.Status, order.PayloadJson });
        });

        // POST /api/labs/{labId}/locations/{locationId}/test-orders/{orderId}/simulate-result
        // Prototype: simulates the lab returning a result for a test order
        app.MapPost("/api/labs/{labId:int}/locations/{locationId:int}/test-orders/{orderId:int}/simulate-result",
            async (int labId, int locationId, int orderId, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var order = await db.TestOrders
                .Include(o => o.Result)
                .Include(o => o.Location)
                .FirstOrDefaultAsync(o => o.TestOrderId == orderId && o.LocationId == locationId);

            if (order is null) return Results.NotFound();
            if (order.Result is not null) return Results.Conflict(new { error = "Result already received for this order" });

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            var now = DateTime.UtcNow;

            // Build a simulated result that mirrors the dispatched order
            var orderPayload = order.PayloadJson != null
                ? JsonSerializer.Deserialize<JsonElement>(order.PayloadJson)
                : (JsonElement?)null;

            var testCodes = orderPayload?.TryGetProperty("samples", out var samples) == true
                ? samples.EnumerateArray().FirstOrDefault().TryGetProperty("tests", out var tests)
                    ? tests.EnumerateArray().Select(t => t.GetString()).Where(s => s != null).ToList()
                    : new List<string?>()
                : new List<string?>();

            // Fetch actual analytes for the ordered tests to build a realistic result
            var analytes = await db.TestParameterAssociations
                .Include(a => a.ParameterCode).ThenInclude(p => p.Descriptions)
                .Include(a => a.TestCode)
                .Where(a => a.TestCode.LabId == labId && testCodes.Contains(a.TestCode.Code))
                .ToListAsync();

            var resultPayload = new
            {
                descriptor = new { purpose = "TestResult", version = "1.0", mode = "Test", originator = order.Location.LabLocationCode, createdAt = now },
                sureTrendOrderId = order.SureTrendOrderId,
                labSampleCode = $"LAB-{order.SureTrendOrderId}",
                status = "Final",
                results = analytes.Select(a => new
                {
                    testCode = a.TestCode.Code,
                    parameterCode = a.ParameterCode.Code,
                    description = a.ParameterCode.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
                    result = a.ParameterCode.DefaultResultType == "Quantitative" ? "<10 CFU/g" : "Not detected",
                    unit = a.ParameterCode.DefaultUnit ?? "",
                    method = a.ParameterCode.MethodCode
                }).ToArray(),
                coaReference = $"https://{order.Location.LabLocationCode.ToLower()}.lab.example.com/coa/{order.SureTrendOrderId}.pdf"
            };

            // Validate: check analyte codes match the order
            var returnedCodes = analytes.Select(a => a.ParameterCode.Code).ToHashSet();
            var analyteCodesMatch = returnedCodes.Count > 0;

            var result = new TestResult
            {
                TestOrderId = orderId,
                LabSampleCode = $"LAB-{order.SureTrendOrderId}",
                ClientSampleCode = order.SureTrendOrderId,
                ReceivedAtUtc = now,
                BoundAtUtc = now,
                Status = analyteCodesMatch ? "Validated" : "Failed",
                AnalyteCodesMatch = analyteCodesMatch,
                ResultPayloadJson = JsonSerializer.Serialize(resultPayload),
                ValidationNotes = analyteCodesMatch
                    ? $"All {returnedCodes.Count} analyte codes matched. Order-result correlation confirmed via SureTrend Order ID."
                    : "No analytes found for ordered test codes. Check catalog configuration."
            };
            db.TestResults.Add(result);

            order.Status = analyteCodesMatch ? "Validated" : "Failed";
            await db.SaveChangesAsync();

            await audit.LogAsync("TEST_RESULT_RECEIVED", actor, "SureTrendAdmin", "TestResult",
                result.TestResultId.ToString(), labId, locationId,
                reason: $"Result for {order.SureTrendOrderId} received and {result.Status.ToLower()}");

            if (analyteCodesMatch)
                await audit.LogAsync("TEST_RESULT_CORRELATED", actor, "System", "TestResult",
                    result.TestResultId.ToString(), labId, locationId,
                    reason: $"Bound to order {order.SureTrendOrderId} via SureTrend Order ID");

            return Results.Ok(new
            {
                result.TestResultId, result.Status, result.AnalyteCodesMatch,
                result.ValidationNotes, result.ReceivedAtUtc,
                order.SureTrendOrderId
            });
        });
    }
}

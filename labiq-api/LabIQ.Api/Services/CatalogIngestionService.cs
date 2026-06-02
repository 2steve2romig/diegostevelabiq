using ClosedXML.Excel;
using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Services;

public record RejectedRow(int RowNumber, string Field, string Rule);

public class CatalogIngestionResult
{
    public bool Success { get; set; }
    public int TotalRows { get; set; }
    public int AcceptedRows { get; set; }
    public List<RejectedRow> RejectedRows { get; set; } = new();
    public int TestCodesAdded { get; set; }
    public int TestCodesUpdated { get; set; }
    public int ParametersAdded { get; set; }
    public int ParametersUpdated { get; set; }
    public int AssociationsAdded { get; set; }
}

public class CatalogIngestionService
{
    private readonly LabIqDbContext _db;
    private readonly AuditService _audit;

    public CatalogIngestionService(LabIqDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<CatalogIngestionResult> IngestCsvAsync(int labId, Stream stream, string actorId)
    {
        using var reader = new StreamReader(stream);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync();
            if (line is not null) lines.Add(line);
        }
        return await IngestRowsAsync(labId, lines, actorId);
    }

    public async Task<CatalogIngestionResult> IngestXlsxAsync(int labId, Stream stream, string actorId)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();
        var lines = new List<string>();
        foreach (var row in ws.RowsUsed())
        {
            var cells = row.CellsUsed().Select(c => c.GetString()).ToArray();
            lines.Add(string.Join(",", cells.Select(v => v.Contains(',') ? $"\"{v}\"" : v)));
        }
        return await IngestRowsAsync(labId, lines, actorId);
    }

    private async Task<CatalogIngestionResult> IngestRowsAsync(int labId, List<string> lines, string actorId)
    {
        var result = new CatalogIngestionResult();
        if (lines.Count < 2)
        {
            result.RejectedRows.Add(new RejectedRow(0, "file", "File must contain a header row and at least one data row"));
            return result;
        }

        var headers = ParseCsvLine(lines[0]);
        var colIdx = BuildColumnIndex(headers);
        var now = DateTime.UtcNow;

        // Validate all rows first — never partially apply
        var parsedRows = new List<(int rowNum, string testCode, string testDesc, string paramCode, string paramDesc, string method, string unit, string resultType)>();
        for (int i = 1; i < lines.Count; i++)
        {
            result.TotalRows++;
            var cols = ParseCsvLine(lines[i]);
            string Get(string key) => colIdx.TryGetValue(key, out var idx) && idx < cols.Length ? cols[idx].Trim() : "";

            var testCode = Get("test code");
            var testDesc = Get("test description");
            var paramCode = Get("analyte code");
            var paramDesc = Get("analyte description");
            var method = Get("reference method");
            var unit = Get("reporting unit");
            var resultType = unit.Contains("CFU") || unit.Contains("/g") || unit.Contains("/mL") ? "Quantitative" : "Qualitative";

            bool rowValid = true;
            if (string.IsNullOrWhiteSpace(testCode))
            {
                result.RejectedRows.Add(new RejectedRow(i + 1, "test_code", "Test code is required"));
                rowValid = false;
            }
            if (string.IsNullOrWhiteSpace(testDesc))
            {
                result.RejectedRows.Add(new RejectedRow(i + 1, "test_description", "Test description is required"));
                rowValid = false;
            }
            if (!string.IsNullOrWhiteSpace(paramCode) && string.IsNullOrWhiteSpace(paramDesc))
            {
                result.RejectedRows.Add(new RejectedRow(i + 1, "analyte_description", "Analyte description is required when analyte code is present"));
                rowValid = false;
            }

            if (rowValid) parsedRows.Add((i + 1, testCode, testDesc, paramCode, paramDesc, method, unit, resultType));
        }

        if (result.RejectedRows.Count > 0)
        {
            result.Success = false;
            return result;
        }

        // All rows valid — apply
        var existingTestCodes = await _db.TestCodes
            .Include(t => t.Descriptions)
            .Where(t => t.LabId == labId)
            .ToDictionaryAsync(t => t.Code);

        var existingParams = await _db.ParameterCodes
            .Include(p => p.Descriptions)
            .Where(p => p.LabId == labId)
            .ToDictionaryAsync(p => p.Code);

        var existingAssociations = await _db.TestParameterAssociations
            .Where(a => a.TestCode.LabId == labId)
            .Select(a => new { a.TestCodeId, a.ParameterCodeId })
            .ToListAsync();

        var assocSet = existingAssociations.Select(a => (a.TestCodeId, a.ParameterCodeId)).ToHashSet();

        foreach (var (_, testCode, testDesc, paramCode, paramDesc, method, unit, resultType) in parsedRows)
        {
            // Test code
            TestCode tc;
            if (existingTestCodes.TryGetValue(testCode, out var existingTc))
            {
                tc = existingTc;
                var current = existingTc.Descriptions.FirstOrDefault(d => d.IsCurrent);
                if (current is not null && current.Description != testDesc)
                {
                    current.EffectiveEnd = now;
                    current.IsCurrent = false;
                    existingTc.Descriptions.Add(new TestDescription { Description = testDesc, EffectiveStart = now, IsCurrent = true });
                    result.TestCodesUpdated++;
                }
            }
            else
            {
                tc = new TestCode
                {
                    LabId = labId,
                    Code = testCode,
                    ActiveFlag = true,
                    CreatedAtUtc = now,
                    Descriptions = new List<TestDescription>
                    {
                        new() { Description = testDesc, EffectiveStart = now, IsCurrent = true }
                    }
                };
                _db.TestCodes.Add(tc);
                existingTestCodes[testCode] = tc;
                result.TestCodesAdded++;
            }

            if (string.IsNullOrWhiteSpace(paramCode)) continue;

            // Parameter code
            ParameterCode pc;
            if (existingParams.TryGetValue(paramCode, out var existingPc))
            {
                pc = existingPc;
                var current = existingPc.Descriptions.FirstOrDefault(d => d.IsCurrent);
                if (current is not null && current.Description != paramDesc)
                {
                    current.EffectiveEnd = now;
                    current.IsCurrent = false;
                    existingPc.Descriptions.Add(new ParameterDescription { Description = paramDesc, EffectiveStart = now, IsCurrent = true });
                    result.ParametersUpdated++;
                }
            }
            else
            {
                pc = new ParameterCode
                {
                    LabId = labId,
                    Code = paramCode,
                    MethodCode = method,
                    MethodName = method,
                    DefaultUnit = unit,
                    DefaultResultType = resultType,
                    ActiveFlag = true,
                    CreatedAtUtc = now,
                    Descriptions = new List<ParameterDescription>
                    {
                        new() { Description = paramDesc, EffectiveStart = now, IsCurrent = true }
                    }
                };
                _db.ParameterCodes.Add(pc);
                existingParams[paramCode] = pc;
                result.ParametersAdded++;
            }

            await _db.SaveChangesAsync();

            if (!assocSet.Contains((tc.TestCodeId, pc.ParameterCodeId)))
            {
                _db.TestParameterAssociations.Add(new TestParameterAssociation
                {
                    TestCodeId = tc.TestCodeId,
                    ParameterCodeId = pc.ParameterCodeId
                });
                assocSet.Add((tc.TestCodeId, pc.ParameterCodeId));
                result.AssociationsAdded++;
            }
        }

        await _db.SaveChangesAsync();

        await _audit.LogAsync(
            "CATALOG_UPLOADED", actorId, "LabAdmin", "TestCatalog",
            labId.ToString(), labId,
            reason: $"Bulk upload: {result.TestCodesAdded} tests added, {result.TestCodesUpdated} updated, {result.ParametersAdded} params added");

        result.AcceptedRows = parsedRows.Count;
        result.Success = true;
        return result;
    }

    private static Dictionary<string, int> BuildColumnIndex(string[] headers)
    {
        var idx = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < headers.Length; i++)
            idx[headers[i].Trim().ToLowerInvariant()] = i;
        return idx;
    }

    private static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var current = new System.Text.StringBuilder();
        foreach (char c in line)
        {
            if (c == '"') { inQuotes = !inQuotes; }
            else if (c == ',' && !inQuotes) { result.Add(current.ToString()); current.Clear(); }
            else { current.Append(c); }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }
}

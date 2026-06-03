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
    public List<object> CreatedTests { get; set; } = new();
}

public class CatalogIngestionService
{
    private readonly LabIqDbContext _db;
    private readonly AuditService _audit;

    public CatalogIngestionService(LabIqDbContext db, AuditService audit) { _db = db; _audit = audit; }

    public async Task<CatalogIngestionResult> IngestCsvAsync(int labId, Stream stream, string actorId, Dictionary<string, string>? columnOverrides = null)
    {
        using var reader = new StreamReader(stream);
        var lines = new List<string>();
        while (!reader.EndOfStream) { var l = await reader.ReadLineAsync(); if (l != null) lines.Add(l); }
        return await IngestRowsAsync(labId, lines, actorId, columnOverrides);
    }

    public async Task<CatalogIngestionResult> IngestXlsxAsync(int labId, Stream stream, string actorId, Dictionary<string, string>? columnOverrides = null)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();
        var lines = ws.RowsUsed()
            .Select(row => string.Join(",", row.CellsUsed().Select(c => c.GetString().Contains(',') ? $"\"{c.GetString()}\"" : c.GetString())))
            .ToList();
        return await IngestRowsAsync(labId, lines, actorId, columnOverrides);
    }

    private async Task<CatalogIngestionResult> IngestRowsAsync(int labId, List<string> lines, string actorId, Dictionary<string, string>? columnOverrides)
    {
        var result = new CatalogIngestionResult();
        if (lines.Count < 2) { result.RejectedRows.Add(new RejectedRow(0, "file", "File must have a header row and at least one data row")); return result; }

        var headers = ParseCsvLine(lines[0]);
        var colIdx = BuildColumnIndex(headers, columnOverrides);
        var now = DateTime.UtcNow;

        // Validate all rows first — never partially apply
        var parsedRows = new List<(int rowNum, string testCode, string testDesc, string matrix, string sampleSize, string testCategory, string paramCode, string paramDesc, string method, string unit, string resultType)>();

        for (int i = 1; i < lines.Count; i++)
        {
            if (string.IsNullOrWhiteSpace(lines[i])) continue;
            result.TotalRows++;
            var cols = ParseCsvLine(lines[i]);
            string Get(string key) => colIdx.TryGetValue(key, out var idx) && idx < cols.Length ? cols[idx].Trim() : "";

            var testCode    = Get("test_code");
            var testDesc    = Get("test_description");
            var paramCode   = Get("analyte_code");
            var paramDesc   = Get("analyte_description");
            var method      = Get("reference_method");
            var unit        = Get("reporting_unit");
            var matrix      = Get("matrix");
            var sampleSize  = Get("sample_size");
            var testCat     = Get("test_category");
            var resultType  = unit.Contains("CFU") || unit.Contains("/g") || unit.Contains("/mL") ? "Quantitative" : "Qualitative";

            bool valid = true;
            if (string.IsNullOrWhiteSpace(testCode))  { result.RejectedRows.Add(new RejectedRow(i+1, "test_code", "Test code is required")); valid = false; }
            if (string.IsNullOrWhiteSpace(testDesc))  { result.RejectedRows.Add(new RejectedRow(i+1, "test_description", "Test description is required")); valid = false; }
            if (!string.IsNullOrWhiteSpace(paramCode) && string.IsNullOrWhiteSpace(paramDesc))
                { result.RejectedRows.Add(new RejectedRow(i+1, "analyte_description", "Analyte description required when analyte code is present")); valid = false; }

            if (valid) parsedRows.Add((i+1, testCode, testDesc, matrix, sampleSize, testCat, paramCode, paramDesc, method, unit, resultType));
        }

        if (result.RejectedRows.Count > 0) { result.Success = false; return result; }

        var existingTests  = await _db.TestCodes.Include(t => t.Descriptions).Where(t => t.LabId == labId).ToDictionaryAsync(t => t.Code);
        var existingParams = await _db.ParameterCodes.Include(p => p.Descriptions).Where(p => p.LabId == labId).ToDictionaryAsync(p => p.Code);
        var existingAssocs = (await _db.TestParameterAssociations.Where(a => a.TestCode.LabId == labId).Select(a => new { a.TestCodeId, a.ParameterCodeId }).ToListAsync()).Select(a => (a.TestCodeId, a.ParameterCodeId)).ToHashSet();

        foreach (var (_, testCode, testDesc, matrix, sampleSize, testCat, paramCode, paramDesc, method, unit, resultType) in parsedRows)
        {
            TestCode tc;
            if (existingTests.TryGetValue(testCode, out var existingTc))
            {
                tc = existingTc;
                var cur = existingTc.Descriptions.FirstOrDefault(d => d.IsCurrent);
                if (cur != null && cur.Description != testDesc) { cur.EffectiveEnd = now; cur.IsCurrent = false; existingTc.Descriptions.Add(new TestDescription { Description = testDesc, EffectiveStart = now, IsCurrent = true }); result.TestCodesUpdated++; }
                if (!string.IsNullOrWhiteSpace(matrix))     tc.Matrix     = matrix;
                if (!string.IsNullOrWhiteSpace(sampleSize)) tc.SampleSize = sampleSize;
                if (!string.IsNullOrWhiteSpace(testCat))    tc.TestCategory = testCat;
            }
            else
            {
                tc = new TestCode { LabId = labId, Code = testCode, ActiveFlag = true, Matrix = matrix, SampleSize = sampleSize, TestCategory = testCat, CreatedAtUtc = now,
                    Descriptions = new List<TestDescription> { new() { Description = testDesc, EffectiveStart = now, IsCurrent = true } } };
                _db.TestCodes.Add(tc);
                existingTests[testCode] = tc;
                result.TestCodesAdded++;
            }

            if (string.IsNullOrWhiteSpace(paramCode)) continue;

            ParameterCode pc;
            if (existingParams.TryGetValue(paramCode, out var existingPc))
            {
                pc = existingPc;
                var cur = existingPc.Descriptions.FirstOrDefault(d => d.IsCurrent);
                if (cur != null && cur.Description != paramDesc) { cur.EffectiveEnd = now; cur.IsCurrent = false; existingPc.Descriptions.Add(new ParameterDescription { Description = paramDesc, EffectiveStart = now, IsCurrent = true }); result.ParametersUpdated++; }
            }
            else
            {
                pc = new ParameterCode { LabId = labId, Code = paramCode, MethodCode = method, MethodName = method, DefaultUnit = unit, DefaultResultType = resultType, ActiveFlag = true, CreatedAtUtc = now,
                    Descriptions = new List<ParameterDescription> { new() { Description = paramDesc, EffectiveStart = now, IsCurrent = true } } };
                _db.ParameterCodes.Add(pc);
                existingParams[paramCode] = pc;
                result.ParametersAdded++;
            }

            await _db.SaveChangesAsync();
            if (!existingAssocs.Contains((tc.TestCodeId, pc.ParameterCodeId)))
            {
                _db.TestParameterAssociations.Add(new TestParameterAssociation { TestCodeId = tc.TestCodeId, ParameterCodeId = pc.ParameterCodeId });
                existingAssocs.Add((tc.TestCodeId, pc.ParameterCodeId));
                result.AssociationsAdded++;
            }
        }

        await _db.SaveChangesAsync();

        // Collect created test summary
        result.CreatedTests = existingTests.Values.Take(10).Select(t => (object)new {
            t.Code,
            Description = t.Descriptions.FirstOrDefault(d => d.IsCurrent)?.Description ?? "",
            AnalyteCount = existingAssocs.Count(a => a.Item1 == t.TestCodeId)
        }).ToList();

        await _audit.LogAsync("CATALOG_UPLOADED", actorId, "LabAdmin", "TestCatalog", labId.ToString(), labId,
            reason: $"Bulk upload: {result.TestCodesAdded} tests added, {result.TestCodesUpdated} updated, {result.ParametersAdded} params added");

        result.AcceptedRows = parsedRows.Count;
        result.Success = true;
        return result;
    }

    // Returns first 10 rows + detected column mapping for wizard preview
    public static (string[] Headers, string[][] Rows, Dictionary<string, int> Mapping) ParsePreview(string csvContent)
    {
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length == 0) return (Array.Empty<string>(), Array.Empty<string[]>(), new());
        var headers = ParseCsvLine(lines[0]);
        var rows = lines.Skip(1).Take(10).Select(ParseCsvLine).ToArray();
        var mapping = BuildColumnIndex(headers, null);
        return (headers, rows, mapping);
    }

    private static Dictionary<string, int> BuildColumnIndex(string[] headers, Dictionary<string, string>? overrides)
    {
        var idx = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        // Auto-detect canonical fields from headers
        var patterns = new Dictionary<string, string[]>
        {
            ["test_code"]           = new[]{"test code","testcode","test cd","tcode","tc"},
            ["test_description"]    = new[]{"test description","test desc","test name","testdescription"},
            ["analyte_code"]        = new[]{"analyte code","analytecode","parameter code","param code","analyte cd"},
            ["analyte_description"] = new[]{"analyte description","analyte desc","analyte name","parameter description","param desc"},
            ["matrix"]              = new[]{"matrix","sample type","product type","substrate"},
            ["reference_method"]    = new[]{"reference method","method","ref method","analytical method"},
            ["sample_size"]         = new[]{"sample size","sample weight","portion size","quantity"},
            ["test_category"]       = new[]{"test category","category","test type","test group"},
            ["reporting_unit"]      = new[]{"reporting unit","unit","result unit","units","rep unit"},
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var h = headers[i].Trim().ToLowerInvariant();
            foreach (var (canonical, aliases) in patterns)
                if (aliases.Any(a => h.Contains(a)) && !idx.ContainsKey(canonical))
                    idx[canonical] = i;
        }

        // Apply manual overrides
        if (overrides != null)
            foreach (var (canonical, colName) in overrides)
            {
                var col = Array.FindIndex(headers, h => h.Trim().Equals(colName, StringComparison.OrdinalIgnoreCase));
                if (col >= 0) idx[canonical] = col;
            }

        return idx;
    }

    public static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var cur = new System.Text.StringBuilder();
        foreach (char c in line)
        {
            if (c == '"') inQuotes = !inQuotes;
            else if (c == ',' && !inQuotes) { result.Add(cur.ToString()); cur.Clear(); }
            else cur.Append(c);
        }
        result.Add(cur.ToString());
        return result.ToArray();
    }
}

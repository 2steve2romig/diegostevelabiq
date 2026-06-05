using LabIQ.Api.Domain;

namespace LabIQ.Api.Data;

public static class SeedData
{
    public static void Initialize(LabIqDbContext db)
    {
        if (db.Labs.Any()) return;

        var now = DateTime.UtcNow;

        // ── Test Lab 1 ───────────────────────────────────────────────────────
        var lab = new Lab
        {
            LabCompanyCode  = "TESTLAB1",
            LegalName       = "Test Lab 1",
            PrimaryAddress  = "123 Imaginary Lane, Springfield, IL 62701",
            PrimaryContact  = "labcontact@testlab1.com",
            AccreditationBody   = "ISO",
            AccreditationNumber = "99999.01",
            SourceLims      = "TestLIMS v1.0",
            CreatedAtUtc    = now,
            Locations = new List<LabLocation>
            {
                new()
                {
                    LabLocationCode = "TL1-MAIN",
                    Address         = "123 Imaginary Lane, Springfield, IL 62701",
                    TimeZone        = "America/Chicago",
                    AvailableFrom   = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Status          = LabLifecycleState.CatalogLoaded,
                    CreatedAtUtc    = now
                }
            }
        };

        db.Labs.Add(lab);
        db.SaveChanges();

        // ── Analytes ─────────────────────────────────────────────────────────
        var analytes = new[]
        {
            ("A001", "Test Organism Alpha",   "Test Method 1.0", "Detected / Not detected per 25 g", "Qualitative"),
            ("A002", "Test Organism Beta",    "Test Method 1.0", "Detected / Not detected per 25 g", "Qualitative"),
            ("A003", "Test Analyte Gamma",    "Test Method 2.0", "CFU/g",                            "Quantitative"),
        };

        var paramMap = new Dictionary<string, ParameterCode>();
        foreach (var (code, desc, method, unit, resultType) in analytes)
        {
            var pc = new ParameterCode
            {
                LabId = lab.LabId, Code = code, MethodCode = method, MethodName = method,
                DefaultUnit = unit, DefaultResultType = resultType, ActiveFlag = true, CreatedAtUtc = now,
                Descriptions = new List<ParameterDescription>
                {
                    new() { Description = desc, EffectiveStart = now, IsCurrent = true }
                }
            };
            db.ParameterCodes.Add(pc);
            paramMap[code] = pc;
        }
        db.SaveChanges();

        // ── Test codes ────────────────────────────────────────────────────────
        var tests = new[]
        {
            ("TC001", "Test Detection Panel Alpha",  "Food product",  "25 g",  "Detection",   new[] { "A001", "A002" }),
            ("TC002", "Test Enumeration Beta",       "Raw material",  "10 g",  "Enumeration", new[] { "A003" }),
            ("TC003", "Test Screening Gamma",        "Environmental", "1 swab","Screening",   Array.Empty<string>()),
        };

        var testMap = new Dictionary<string, TestCode>();
        foreach (var (code, desc, matrix, sampleSize, category, paramCodes) in tests)
        {
            var tc = new TestCode
            {
                LabId = lab.LabId, Code = code, ActiveFlag = true,
                Matrix = matrix, SampleSize = sampleSize, TestCategory = category,
                CreatedAtUtc = now,
                Descriptions = new List<TestDescription>
                {
                    new() { Description = desc, EffectiveStart = now, IsCurrent = true }
                }
            };
            db.TestCodes.Add(tc);
            db.SaveChanges();

            foreach (var pCode in paramCodes)
                db.TestParameterAssociations.Add(new TestParameterAssociation
                {
                    TestCodeId = tc.TestCodeId,
                    ParameterCodeId = paramMap[pCode].ParameterCodeId
                });

            db.SaveChanges();
            testMap[code] = tc;
        }

        // ── Location test availability ─────────────────────────────────────
        var main = lab.Locations.First();
        foreach (var tc in testMap.Values)
            db.LocationTestAvailabilities.Add(new LocationTestAvailability
            {
                LocationId = main.LocationId,
                TestCodeId = tc.TestCodeId
            });

        db.SaveChanges();

        // ── Audit events ──────────────────────────────────────────────────────
        db.AuditEvents.AddRange(
            new AuditEvent
            {
                EventType = "LAB_CREATED", TimestampUtc = now, ActorId = "system-seed",
                ActorRole = "SureTrendAdmin", LabId = lab.LabId, ObjectType = "Lab",
                ObjectId = lab.LabId.ToString(), Reason = "Initial seed data"
            },
            new AuditEvent
            {
                EventType = "CATALOG_UPLOADED", TimestampUtc = now.AddMinutes(-5), ActorId = "system-seed",
                ActorRole = "SureTrendAdmin", LabId = lab.LabId, ObjectType = "TestCatalog",
                AfterStateHash = "3 tests, 3 analytes", Reason = "Initial catalog load"
            }
        );

        db.SaveChanges();
    }
}

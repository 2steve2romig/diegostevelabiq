using LabIQ.Api.Domain;

namespace LabIQ.Api.Data;

public static class SeedData
{
    public static void Initialize(LabIqDbContext db)
    {
        if (db.Labs.Any()) return;

        var now = DateTime.UtcNow;

        var fsns = new Lab
        {
            LabCompanyCode = "FSNS",
            LegalName = "Food Safety Net Services",
            PrimaryAddress = "4712 Research Drive, San Antonio, TX 78240",
            PrimaryContact = "lab-ops@fsns.com",
            AccreditationBody = "A2LA",
            AccreditationNumber = "2501.01",
            CreatedAtUtc = now,
            Locations = new List<LabLocation>
            {
                new()
                {
                    LabLocationCode = "FSNS-BLM",
                    Address = "Bloomsburg, PA 17815",
                    TimeZone = "America/New_York",
                    AvailableFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Status = LabLifecycleState.CatalogLoaded,
                    CreatedAtUtc = now
                },
                new()
                {
                    LabLocationCode = "FSNS-MDV",
                    Address = "Meadville, PA 16335",
                    TimeZone = "America/New_York",
                    AvailableFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Status = LabLifecycleState.Draft,
                    CreatedAtUtc = now
                }
            }
        };

        db.Labs.Add(fsns);
        db.SaveChanges();

        // Seed test catalog from sample data
        var testRows = new[]
        {
            ("QM103", "Listeria monocytogenes detection", "P001", "Listeria monocytogenes", "AOAC RI 070902", "Detected / Not detected per 25 g"),
            ("QM103", "Listeria monocytogenes detection", "P002", "Listeria spp.", "AOAC RI 070902", "Detected / Not detected per 25 g"),
            ("QM117", "Salmonella spp. detection",       "P003", "Salmonella spp.", "FDA BAM Ch. 5", "Detected / Not detected per 25 g"),
            ("QM117", "Salmonella spp. detection",       "P004", "Salmonella Enteritidis", "FDA BAM Ch. 5", "Detected / Not detected per 25 g"),
            ("QM118", "Yeast and Mold combined enumeration", "P009", "Yeast", "FDA BAM Ch. 18", "CFU/g"),
            ("QM118", "Yeast and Mold combined enumeration", "P010", "Mold", "FDA BAM Ch. 18", "CFU/g"),
            ("QM999", "Quick screen coliforms only",     "",     "",     "Internal SOP MIC-042", "Screen result"),
            ("QC089", "Cronobacter sakazakii powdered formula", "A012", "Cronobacter sakazakii", "ISO 22964:2017", "Detected / Not detected per 25 g"),
        };

        var testCodeMap = new Dictionary<string, TestCode>();
        var paramCodeMap = new Dictionary<string, ParameterCode>();

        foreach (var (tCode, tDesc, pCode, pDesc, method, unit) in testRows)
        {
            if (!testCodeMap.TryGetValue(tCode, out var tc))
            {
                tc = new TestCode
                {
                    LabId = fsns.LabId,
                    Code = tCode,
                    ActiveFlag = true,
                    CreatedAtUtc = now,
                    Descriptions = new List<TestDescription>
                    {
                        new() { Description = tDesc, EffectiveStart = now, IsCurrent = true }
                    }
                };
                db.TestCodes.Add(tc);
                testCodeMap[tCode] = tc;
            }

            if (string.IsNullOrEmpty(pCode)) continue;

            if (!paramCodeMap.TryGetValue(pCode, out var pc))
            {
                pc = new ParameterCode
                {
                    LabId = fsns.LabId,
                    Code = pCode,
                    MethodCode = method,
                    MethodName = method,
                    DefaultUnit = unit,
                    DefaultResultType = unit.Contains("CFU") ? "Quantitative" : "Qualitative",
                    ActiveFlag = true,
                    CreatedAtUtc = now,
                    Descriptions = new List<ParameterDescription>
                    {
                        new() { Description = pDesc, EffectiveStart = now, IsCurrent = true }
                    }
                };
                db.ParameterCodes.Add(pc);
                paramCodeMap[pCode] = pc;
            }

            db.SaveChanges();

            db.TestParameterAssociations.Add(new TestParameterAssociation
            {
                TestCodeId = tc.TestCodeId,
                ParameterCodeId = pc.ParameterCodeId
            });
        }

        db.SaveChanges();

        // Seed audit events
        db.AuditEvents.Add(new AuditEvent
        {
            EventType = "LAB_CREATED",
            TimestampUtc = now,
            ActorId = "system-seed",
            ActorRole = "SureTrendAdmin",
            LabId = fsns.LabId,
            ObjectType = "Lab",
            ObjectId = fsns.LabId.ToString(),
            Reason = "Initial seed data"
        });

        db.SaveChanges();
    }
}

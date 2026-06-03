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
            SourceLims = "LabWare LIMS 7",
            CreatedAtUtc = now,
            Locations = new List<LabLocation>
            {
                new() { LabLocationCode = "FSNS-BLM", Address = "Bloomsburg, PA 17815", TimeZone = "America/New_York",
                        AvailableFrom = new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.CatalogLoaded, CreatedAtUtc = now },
                new() { LabLocationCode = "FSNS-MDV", Address = "Meadville, PA 16335",  TimeZone = "America/New_York",
                        AvailableFrom = new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.MappingConfirmed, CreatedAtUtc = now },
                new() { LabLocationCode = "FSNS-VIS", Address = "Visalia, CA 93291",    TimeZone = "America/Los_Angeles",
                        AvailableFrom = new DateTime(2026,2,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.Live, CreatedAtUtc = now },
            }
        };

        var eurofins = new Lab
        {
            LabCompanyCode = "EUROFINS",
            LegalName = "Eurofins Scientific Inc.",
            PrimaryAddress = "2200 Rittenhouse Square, Des Moines, IA 50321",
            PrimaryContact = "integration@eurofins.com",
            AccreditationBody = "A2LA",
            AccreditationNumber = "1983.01",
            SourceLims = "Eurofins eLIMS",
            CreatedAtUtc = now,
            Locations = new List<LabLocation>
            {
                new() { LabLocationCode = "EF-MAD", Address = "Madison, WI 53718",     TimeZone = "America/Chicago",
                        AvailableFrom = new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.Live, CreatedAtUtc = now },
                new() { LabLocationCode = "EF-DSM", Address = "Des Moines, IA 50321",  TimeZone = "America/Chicago",
                        AvailableFrom = new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.Live, CreatedAtUtc = now },
                new() { LabLocationCode = "EF-NBL", Address = "New Berlin, WI 53151",  TimeZone = "America/Chicago",
                        AvailableFrom = new DateTime(2026,3,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.TestTransactionsConfirmed, CreatedAtUtc = now },
            }
        };

        var certified = new Lab
        {
            LabCompanyCode = "CERTIFIED",
            LegalName = "Certified Laboratories Inc.",
            PrimaryAddress = "100 Voice Road, Carle Place, NY 11514",
            PrimaryContact = "lims@certifiedlabs.com",
            AccreditationBody = "AIHA-LAP",
            AccreditationNumber = "101385",
            SourceLims = "STARLIMS v12",
            CreatedAtUtc = now,
            Locations = new List<LabLocation>
            {
                new() { LabLocationCode = "CERT-PLV", Address = "Plainview, NY 11803", TimeZone = "America/New_York",
                        AvailableFrom = new DateTime(2026,2,1,0,0,0,DateTimeKind.Utc), Status = LabLifecycleState.Draft, CreatedAtUtc = now },
            }
        };

        db.Labs.AddRange(fsns, eurofins, certified);
        db.SaveChanges();

        // ── Parameter codes ──────────────────────────────────────────────────
        var analytes = new[]
        {
            ("P001","Listeria monocytogenes","AOAC RI 070902","Detected / Not detected per 25 g","Qualitative"),
            ("P002","Listeria spp.",          "AOAC RI 070902","Detected / Not detected per 25 g","Qualitative"),
            ("P003","Salmonella spp.",         "FDA BAM Ch. 5", "Detected / Not detected per 25 g","Qualitative"),
            ("P004","Salmonella Enteritidis",  "FDA BAM Ch. 5", "Detected / Not detected per 25 g","Qualitative"),
            ("P005","Aerobic plate count",     "FDA BAM Ch. 3", "CFU/g","Quantitative"),
            ("P006","E. coli O157:H7",         "FDA BAM Ch. 4A","Detected / Not detected per 25 g","Qualitative"),
            ("P007","Enterobacteriaceae",       "ISO 21528-2",   "CFU/g","Quantitative"),
            ("P008","Yeast",                   "FDA BAM Ch. 18","CFU/g","Quantitative"),
            ("P009","Mold",                    "FDA BAM Ch. 18","CFU/g","Quantitative"),
            ("P010","Total coliforms",         "FDA BAM Ch. 4", "CFU/g","Quantitative"),
            ("P011","E. coli (coliforms panel)","FDA BAM Ch. 4","CFU/g","Quantitative"),
            ("P012","Lactic acid bacteria",    "ISO 15214",     "CFU/g","Quantitative"),
            ("P013","Cronobacter sakazakii",   "ISO 22964:2017","Detected / Not detected per 25 g","Qualitative"),
        };

        var paramMap = new Dictionary<string, ParameterCode>();
        foreach (var (code, desc, method, unit, resultType) in analytes)
        {
            var pc = new ParameterCode
            {
                LabId = fsns.LabId, Code = code, MethodCode = method, MethodName = method,
                DefaultUnit = unit, DefaultResultType = resultType, ActiveFlag = true, CreatedAtUtc = now,
                Descriptions = new List<ParameterDescription> { new() { Description = desc, EffectiveStart = now, IsCurrent = true } }
            };
            db.ParameterCodes.Add(pc);
            paramMap[code] = pc;
        }
        db.SaveChanges();

        // ── Test codes ───────────────────────────────────────────────────────
        var tests = new[]
        {
            ("QM103","Listeria monocytogenes detection",          "RTE food",           "25 g",   "Pathogen detection",   new[]{"P001","P002"}),
            ("QM104","Listeria monocytogenes quantification",     "RTE food",           "25 g",   "Pathogen detection",   new[]{"P001"}),
            ("QM117","Salmonella spp. detection",                 "Raw poultry",        "25 g",   "Pathogen detection",   new[]{"P003","P004"}),
            ("QM118","Salmonella environmental swab",             "Environmental",      "1 swab", "Pathogen detection",   new[]{"P003"}),
            ("QM201","Aerobic plate count",                       "Finished product",   "10 g",   "Indicator organisms",  new[]{"P005"}),
            ("QM301","E. coli O157:H7",                          "Raw beef",           "25 g",   "Pathogen detection",   new[]{"P006"}),
            ("QM302","Enterobacteriaceae enumeration",            "Finished product",   "10 g",   "Indicator organisms",  new[]{"P007"}),
            ("QM401","Yeast and mold combined enumeration",       "Bakery ingredient",  "10 g",   "Enumeration",          new[]{"P008","P009"}),
            ("QM501","Total coliforms enumeration",               "Finished product",   "10 g",   "Indicator organisms",  new[]{"P010","P011"}),
            ("QM502","Total coliforms detection",                 "Finished product",   "10 g",   "Indicator organisms",  new[]{"P010"}),
            ("QM601","Lactic acid bacteria enumeration",          "Dairy product",      "10 g",   "Enumeration",          new[]{"P012"}),
            ("QM999","Quick screen coliforms only",               "Finished product",   "1 swab", "Indicator organisms",  Array.Empty<string>()),
            ("QC089","Cronobacter sakazakii powdered formula",    "Powdered formula",   "25 g",   "Pathogen detection",   new[]{"P013"}),
        };

        var testMap = new Dictionary<string, TestCode>();
        foreach (var (code, desc, matrix, sampleSize, category, paramCodes) in tests)
        {
            var tc = new TestCode
            {
                LabId = fsns.LabId, Code = code, ActiveFlag = true,
                Matrix = matrix, SampleSize = sampleSize, TestCategory = category,
                CreatedAtUtc = now,
                Descriptions = new List<TestDescription> { new() { Description = desc, EffectiveStart = now, IsCurrent = true } }
            };
            db.TestCodes.Add(tc);
            db.SaveChanges();

            foreach (var pCode in paramCodes)
                db.TestParameterAssociations.Add(new TestParameterAssociation { TestCodeId = tc.TestCodeId, ParameterCodeId = paramMap[pCode].ParameterCodeId });

            db.SaveChanges();
            testMap[code] = tc;
        }

        // ── Location test availability ────────────────────────────────────────
        var blm = fsns.Locations.First(l => l.LabLocationCode == "FSNS-BLM");
        var mdv = fsns.Locations.First(l => l.LabLocationCode == "FSNS-MDV");
        var vis = fsns.Locations.First(l => l.LabLocationCode == "FSNS-VIS");

        foreach (var code in new[] { "QM103","QM117","QM201","QM301","QM302","QM401","QM501","QM601" })
            db.LocationTestAvailabilities.Add(new LocationTestAvailability { LocationId = blm.LocationId, TestCodeId = testMap[code].TestCodeId });
        foreach (var code in new[] { "QM103","QM104","QM117","QM118","QM201","QM401","QM999","QC089" })
            db.LocationTestAvailabilities.Add(new LocationTestAvailability { LocationId = mdv.LocationId, TestCodeId = testMap[code].TestCodeId });
        foreach (var code in new[] { "QM103","QM117","QM201","QM401","QM601","QC089" })
            db.LocationTestAvailabilities.Add(new LocationTestAvailability { LocationId = vis.LocationId, TestCodeId = testMap[code].TestCodeId });
        db.SaveChanges();

        // ── Audit events ──────────────────────────────────────────────────────
        foreach (var lab in new[] { fsns, eurofins, certified })
            db.AuditEvents.Add(new AuditEvent { EventType = "LAB_CREATED", TimestampUtc = now.AddHours(-2), ActorId = "system-seed",
                ActorRole = "SureTrendAdmin", LabId = lab.LabId, ObjectType = "Lab", ObjectId = lab.LabId.ToString(), Reason = "Initial onboarding" });

        db.AuditEvents.Add(new AuditEvent { EventType = "CATALOG_UPLOADED", TimestampUtc = now.AddMinutes(-90), ActorId = "system-seed",
            ActorRole = "SureTrendAdmin", LabId = fsns.LabId, ObjectType = "TestCatalog",
            AfterStateHash = "13 tests, 13 analytes", Reason = "Initial catalog load via CSV" });

        db.AuditEvents.Add(new AuditEvent { EventType = "LIFECYCLE_TRANSITION", TimestampUtc = now.AddMinutes(-30), ActorId = "system-seed",
            ActorRole = "SureTrendAdmin", LabId = fsns.LabId, LocationId = vis.LocationId,
            ObjectType = "LabLocation", ObjectId = vis.LocationId.ToString(),
            BeforeStateHash = "TestTransactionsConfirmed", AfterStateHash = "Live", Reason = "All test transactions validated" });

        db.AuditEvents.Add(new AuditEvent { EventType = "LIFECYCLE_TRANSITION", TimestampUtc = now.AddMinutes(-60), ActorId = "system-seed",
            ActorRole = "SureTrendAdmin", LabId = eurofins.LabId,
            ObjectType = "LabLocation", BeforeStateHash = "MappingConfirmed", AfterStateHash = "TestTransactionsConfirmed",
            Reason = "Test transaction round-trip completed" });

        db.SaveChanges();
    }
}

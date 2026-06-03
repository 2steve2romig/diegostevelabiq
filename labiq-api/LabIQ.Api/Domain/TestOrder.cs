namespace LabIQ.Api.Domain;

public class TestOrder
{
    public int TestOrderId { get; set; }
    public int LocationId { get; set; }
    public LabLocation Location { get; set; } = null!;
    public string SureTrendOrderId { get; set; } = null!;
    public DateTime DispatchedAtUtc { get; set; }
    public string Mode { get; set; } = "Test";           // Test | Production
    public string Status { get; set; } = "Dispatched";   // Dispatched | ResultReceived | Validated | Failed | NoResponse
    public string? PayloadJson { get; set; }
    public string? DispatchedBy { get; set; }

    public TestResult? Result { get; set; }
}

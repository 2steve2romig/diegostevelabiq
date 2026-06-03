namespace LabIQ.Api.Domain;

public class TestResult
{
    public int TestResultId { get; set; }
    public int TestOrderId { get; set; }
    public TestOrder TestOrder { get; set; } = null!;
    public string? LabSampleCode { get; set; }
    public string? ClientSampleCode { get; set; }
    public DateTime ReceivedAtUtc { get; set; }
    public DateTime? BoundAtUtc { get; set; }
    public string Status { get; set; } = "Received";     // Received | Bound | Validated | Failed
    public bool AnalyteCodesMatch { get; set; }
    public string? ResultPayloadJson { get; set; }
    public string? ValidationNotes { get; set; }
}

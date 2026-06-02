namespace LabIQ.Api.Domain;

public class TestDescription
{
    public int TestDescriptionId { get; set; }
    public int TestCodeId { get; set; }
    public TestCode TestCode { get; set; } = null!;
    public string Description { get; set; } = null!;
    public DateTime EffectiveStart { get; set; }
    public DateTime? EffectiveEnd { get; set; }
    public bool IsCurrent { get; set; }
}

namespace LabIQ.Api.Domain;

public class LocationTestAvailability
{
    public int LocationId { get; set; }
    public LabLocation Location { get; set; } = null!;
    public int TestCodeId { get; set; }
    public TestCode TestCode { get; set; } = null!;
}

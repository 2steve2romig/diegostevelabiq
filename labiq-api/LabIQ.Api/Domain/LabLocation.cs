namespace LabIQ.Api.Domain;

public class LabLocation
{
    public int LocationId { get; set; }
    public int LabId { get; set; }
    public Lab Lab { get; set; } = null!;
    public string LabLocationCode { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string TimeZone { get; set; } = null!;
    public DateTime AvailableFrom { get; set; }
    public LabLifecycleState Status { get; set; } = LabLifecycleState.Draft;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<LocationTestAvailability> TestAvailability { get; set; } = new List<LocationTestAvailability>();
}

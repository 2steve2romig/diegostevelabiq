namespace LabIQ.Api.Domain;

public class AuditEvent
{
    public long EventId { get; set; }
    public string EventType { get; set; } = null!;
    public DateTime TimestampUtc { get; set; }
    public string ActorId { get; set; } = null!;
    public string ActorRole { get; set; } = null!;
    public int? LabId { get; set; }
    public int? LocationId { get; set; }
    public string ObjectType { get; set; } = null!;
    public string? ObjectId { get; set; }
    public string? BeforeStateHash { get; set; }
    public string? AfterStateHash { get; set; }
    public string? Reason { get; set; }
}

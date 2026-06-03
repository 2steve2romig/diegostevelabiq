namespace LabIQ.Api.Domain;

/// <summary>
/// Immutable receipt record for every file or message received on any transport channel.
/// Required for 21 CFR Part 11 audit compliance. Never updated or deleted.
/// </summary>
public class InboundFileAcknowledgment
{
    public int AckId { get; set; }
    public int ChannelId { get; set; }
    public TransportChannel Channel { get; set; } = null!;
    public string OriginalFileName { get; set; } = null!;
    public DateTime ReceivedAtUtc { get; set; }
    public string ReceivedByIdentity { get; set; } = null!;
    public long FileSizeBytes { get; set; }
    public string Sha256Checksum { get; set; } = null!;
}

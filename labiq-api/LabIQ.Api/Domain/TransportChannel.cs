namespace LabIQ.Api.Domain;

public class TransportChannel
{
    public int ChannelId { get; set; }
    public int LocationId { get; set; }
    public LabLocation Location { get; set; } = null!;

    // RestApi | Sftp | EncryptedEmail | SelfDescribingPdf
    public string ChannelType { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    // SFTP fields
    public string? HostingMode { get; set; }   // SureTrendHosted | LabHosted
    public string? Host { get; set; }
    public int? Port { get; set; }
    public string? InboxPath { get; set; }
    public string? OutboxPath { get; set; }
    public string? ArchivePath { get; set; }
    public string? PublicKeyFingerprint { get; set; }

    // REST API fields
    public string? EndpointUrl { get; set; }
    public string? AuthType { get; set; }      // OAuth2 | mTLS | ApiKey

    // Email fields
    public string? EncryptionType { get; set; }  // SMIME | PGP
    public string? RecipientAddress { get; set; }

    // Shared
    public string? FileNamingTemplate { get; set; }

    public ICollection<InboundFileAcknowledgment> Acknowledgments { get; set; } = new List<InboundFileAcknowledgment>();
}

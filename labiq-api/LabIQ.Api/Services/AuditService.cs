using LabIQ.Api.Data;
using LabIQ.Api.Domain;

namespace LabIQ.Api.Services;

public class AuditService
{
    private readonly LabIqDbContext _db;

    public AuditService(LabIqDbContext db) => _db = db;

    public async Task LogAsync(
        string eventType,
        string actorId,
        string actorRole,
        string objectType,
        string? objectId = null,
        int? labId = null,
        int? locationId = null,
        string? reason = null,
        string? beforeHash = null,
        string? afterHash = null)
    {
        _db.AuditEvents.Add(new AuditEvent
        {
            EventType = eventType,
            TimestampUtc = DateTime.UtcNow,
            ActorId = actorId,
            ActorRole = actorRole,
            LabId = labId,
            LocationId = locationId,
            ObjectType = objectType,
            ObjectId = objectId,
            Reason = reason,
            BeforeStateHash = beforeHash,
            AfterStateHash = afterHash
        });
        await _db.SaveChangesAsync();
    }
}

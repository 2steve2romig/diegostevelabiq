using LabIQ.Api.Data;
using LabIQ.Api.Domain;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Endpoints;

public static class TransportChannelEndpoints
{
    public static void MapTransportChannelEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/labs/{labId}/locations/{locationId}/channels
        app.MapGet("/api/labs/{labId:int}/locations/{locationId:int}/channels", async (int labId, int locationId, LabIqDbContext db) =>
        {
            var channels = await db.TransportChannels
                .Where(c => c.LocationId == locationId)
                .OrderBy(c => c.ChannelType)
                .Select(c => new
                {
                    c.ChannelId, c.ChannelType, c.IsActive, c.CreatedAtUtc,
                    c.HostingMode, c.Host, c.Port, c.InboxPath, c.OutboxPath,
                    c.ArchivePath, c.PublicKeyFingerprint, c.EndpointUrl,
                    c.AuthType, c.EncryptionType, c.RecipientAddress,
                    c.FileNamingTemplate
                })
                .ToListAsync();

            return Results.Ok(channels);
        });

        // PUT /api/labs/{labId}/locations/{locationId}/channels/{type} — upsert
        app.MapPut("/api/labs/{labId:int}/locations/{locationId:int}/channels/{type}", async (int labId, int locationId, string type, UpsertChannelRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var validTypes = new[] { "RestApi", "Sftp", "EncryptedEmail", "SelfDescribingPdf" };
            if (!validTypes.Contains(type))
                return Results.BadRequest(new { error = $"Unknown channel type. Valid: {string.Join(", ", validTypes)}" });

            var loc = await db.LabLocations.FirstOrDefaultAsync(l => l.LabId == labId && l.LocationId == locationId);
            if (loc is null) return Results.NotFound();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";

            var channel = await db.TransportChannels.FirstOrDefaultAsync(c => c.LocationId == locationId && c.ChannelType == type);
            var isNew = channel is null;

            if (isNew)
            {
                channel = new TransportChannel { LocationId = locationId, ChannelType = type, CreatedAtUtc = DateTime.UtcNow };
                db.TransportChannels.Add(channel);
            }

            // Apply fields from request
            channel.IsActive          = req.IsActive ?? channel.IsActive;
            channel.HostingMode       = req.HostingMode       ?? channel.HostingMode;
            channel.Host              = req.Host              ?? channel.Host;
            channel.Port              = req.Port              ?? channel.Port;
            channel.InboxPath         = req.InboxPath         ?? channel.InboxPath;
            channel.OutboxPath        = req.OutboxPath        ?? channel.OutboxPath;
            channel.ArchivePath       = req.ArchivePath       ?? channel.ArchivePath;
            channel.PublicKeyFingerprint = req.PublicKeyFingerprint ?? channel.PublicKeyFingerprint;
            channel.EndpointUrl       = req.EndpointUrl       ?? channel.EndpointUrl;
            channel.AuthType          = req.AuthType          ?? channel.AuthType;
            channel.EncryptionType    = req.EncryptionType    ?? channel.EncryptionType;
            channel.RecipientAddress  = req.RecipientAddress  ?? channel.RecipientAddress;
            channel.FileNamingTemplate = req.FileNamingTemplate ?? channel.FileNamingTemplate;

            await db.SaveChangesAsync();

            await audit.LogAsync(
                isNew ? "INTEGRATION_CHANNEL_CONFIGURED" : "INTEGRATION_CHANNEL_UPDATED",
                actor, "SureTrendAdmin", "TransportChannel",
                channel.ChannelId.ToString(), labId, locationId,
                reason: req.Reason ?? $"{type} channel {(isNew ? "configured" : "updated")}");

            return Results.Ok(new { channel.ChannelId, channel.ChannelType, channel.IsActive });
        });

        // DELETE /api/labs/{labId}/locations/{locationId}/channels/{type}
        app.MapDelete("/api/labs/{labId:int}/locations/{locationId:int}/channels/{type}", async (int labId, int locationId, string type, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var channel = await db.TransportChannels.FirstOrDefaultAsync(c => c.LocationId == locationId && c.ChannelType == type);
            if (channel is null) return Results.NotFound();

            channel.IsActive = false;
            await db.SaveChangesAsync();

            var actor = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "anonymous";
            await audit.LogAsync("INTEGRATION_CHANNEL_DEACTIVATED", actor, "SureTrendAdmin", "TransportChannel",
                channel.ChannelId.ToString(), labId, locationId);

            return Results.Ok(new { channel.ChannelId, channel.IsActive });
        });

        // POST /api/labs/{labId}/locations/{locationId}/channels/{channelId}/acknowledgments
        app.MapPost("/api/labs/{labId:int}/locations/{locationId:int}/channels/{channelId:int}/acknowledgments",
            async (int labId, int locationId, int channelId, AcknowledgmentRequest req, LabIqDbContext db, AuditService audit, HttpContext http) =>
        {
            var channel = await db.TransportChannels.FindAsync(channelId);
            if (channel is null || channel.LocationId != locationId) return Results.NotFound();

            var ack = new InboundFileAcknowledgment
            {
                ChannelId = channelId,
                OriginalFileName = req.OriginalFileName,
                ReceivedAtUtc = DateTime.UtcNow,
                ReceivedByIdentity = http.Request.Headers["X-User-Id"].FirstOrDefault() ?? "system",
                FileSizeBytes = req.FileSizeBytes,
                Sha256Checksum = req.Sha256Checksum
            };
            db.InboundFileAcknowledgments.Add(ack);
            await db.SaveChangesAsync();

            await audit.LogAsync("INBOUND_FILE_ACKNOWLEDGED", ack.ReceivedByIdentity, "System", "InboundFile",
                ack.AckId.ToString(), labId, locationId,
                reason: $"{req.OriginalFileName} ({req.FileSizeBytes} bytes) SHA256:{req.Sha256Checksum[..16]}…");

            return Results.Created("", new { ack.AckId, ack.ReceivedAtUtc, ack.Sha256Checksum });
        });

        // GET /api/labs/{labId}/locations/{locationId}/channels/{channelId}/acknowledgments
        app.MapGet("/api/labs/{labId:int}/locations/{locationId:int}/channels/{channelId:int}/acknowledgments",
            async (int labId, int locationId, int channelId, LabIqDbContext db) =>
        {
            var acks = await db.InboundFileAcknowledgments
                .Where(a => a.ChannelId == channelId)
                .OrderByDescending(a => a.ReceivedAtUtc)
                .Take(50)
                .Select(a => new { a.AckId, a.OriginalFileName, a.ReceivedAtUtc, a.ReceivedByIdentity, a.FileSizeBytes, a.Sha256Checksum })
                .ToListAsync();
            return Results.Ok(acks);
        });
    }
}

public record UpsertChannelRequest(
    bool? IsActive, string? HostingMode, string? Host, int? Port,
    string? InboxPath, string? OutboxPath, string? ArchivePath,
    string? PublicKeyFingerprint, string? EndpointUrl, string? AuthType,
    string? EncryptionType, string? RecipientAddress,
    string? FileNamingTemplate, string? Reason);

public record AcknowledgmentRequest(
    string OriginalFileName, long FileSizeBytes, string Sha256Checksum);

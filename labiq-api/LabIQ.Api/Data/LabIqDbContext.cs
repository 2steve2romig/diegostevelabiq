using LabIQ.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LabIQ.Api.Data;

public class LabIqDbContext : DbContext
{
    public LabIqDbContext(DbContextOptions<LabIqDbContext> options) : base(options) { }

    public DbSet<Lab> Labs => Set<Lab>();
    public DbSet<LabLocation> LabLocations => Set<LabLocation>();
    public DbSet<TestCode> TestCodes => Set<TestCode>();
    public DbSet<TestDescription> TestDescriptions => Set<TestDescription>();
    public DbSet<ParameterCode> ParameterCodes => Set<ParameterCode>();
    public DbSet<ParameterDescription> ParameterDescriptions => Set<ParameterDescription>();
    public DbSet<TestParameterAssociation> TestParameterAssociations => Set<TestParameterAssociation>();
    public DbSet<LocationTestAvailability> LocationTestAvailabilities => Set<LocationTestAvailability>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TestParameterAssociation>()
            .HasKey(x => new { x.TestCodeId, x.ParameterCodeId });

        modelBuilder.Entity<LocationTestAvailability>()
            .HasKey(x => new { x.LocationId, x.TestCodeId });

        modelBuilder.Entity<Lab>()
            .HasIndex(l => l.LabCompanyCode).IsUnique();

        modelBuilder.Entity<TestCode>()
            .HasIndex(t => new { t.LabId, t.Code }).IsUnique();

        modelBuilder.Entity<ParameterCode>()
            .HasIndex(p => new { p.LabId, p.Code }).IsUnique();

        modelBuilder.Entity<LabLocation>()
            .HasIndex(l => new { l.LabId, l.LabLocationCode }).IsUnique();

        modelBuilder.Entity<LabLocation>()
            .HasKey(l => l.LocationId);

        modelBuilder.Entity<LabLocation>()
            .Property(l => l.Status)
            .HasConversion<string>();

        modelBuilder.Entity<AuditEvent>()
            .HasKey(e => e.EventId);

        modelBuilder.Entity<AuditEvent>()
            .Property(e => e.EventId)
            .ValueGeneratedOnAdd();
    }
}

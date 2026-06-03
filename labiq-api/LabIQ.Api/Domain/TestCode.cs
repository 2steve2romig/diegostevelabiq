namespace LabIQ.Api.Domain;

public class TestCode
{
    public int TestCodeId { get; set; }
    public int LabId { get; set; }
    public Lab Lab { get; set; } = null!;
    public string Code { get; set; } = null!;
    public bool ActiveFlag { get; set; } = true;
    public string? Matrix { get; set; }
    public string? SampleSize { get; set; }
    public string? TestCategory { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<TestDescription> Descriptions { get; set; } = new List<TestDescription>();
    public ICollection<TestParameterAssociation> ParameterAssociations { get; set; } = new List<TestParameterAssociation>();
}

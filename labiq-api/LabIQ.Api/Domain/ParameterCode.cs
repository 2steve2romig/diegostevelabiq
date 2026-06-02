namespace LabIQ.Api.Domain;

public class ParameterCode
{
    public int ParameterCodeId { get; set; }
    public int LabId { get; set; }
    public Lab Lab { get; set; } = null!;
    public string Code { get; set; } = null!;
    public string MethodCode { get; set; } = null!;
    public string MethodName { get; set; } = null!;
    public string? DefaultUnit { get; set; }
    public string? DefaultResultType { get; set; }
    public bool ActiveFlag { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<ParameterDescription> Descriptions { get; set; } = new List<ParameterDescription>();
    public ICollection<TestParameterAssociation> TestAssociations { get; set; } = new List<TestParameterAssociation>();
}

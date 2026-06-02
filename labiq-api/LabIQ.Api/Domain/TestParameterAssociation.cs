namespace LabIQ.Api.Domain;

public class TestParameterAssociation
{
    public int TestCodeId { get; set; }
    public TestCode TestCode { get; set; } = null!;
    public int ParameterCodeId { get; set; }
    public ParameterCode ParameterCode { get; set; } = null!;
}

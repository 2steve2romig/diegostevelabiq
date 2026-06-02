namespace LabIQ.Api.Domain;

public class Lab
{
    public int LabId { get; set; }
    public string LabCompanyCode { get; set; } = null!;
    public string LegalName { get; set; } = null!;
    public string PrimaryAddress { get; set; } = null!;
    public string PrimaryContact { get; set; } = null!;
    public string? AccreditationBody { get; set; }
    public string? AccreditationNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<LabLocation> Locations { get; set; } = new List<LabLocation>();
    public ICollection<TestCode> TestCodes { get; set; } = new List<TestCode>();
    public ICollection<ParameterCode> ParameterCodes { get; set; } = new List<ParameterCode>();
}

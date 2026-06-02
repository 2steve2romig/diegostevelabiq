namespace LabIQ.Api.Domain;

public class ParameterDescription
{
    public int ParameterDescriptionId { get; set; }
    public int ParameterCodeId { get; set; }
    public ParameterCode ParameterCode { get; set; } = null!;
    public string Description { get; set; } = null!;
    public DateTime EffectiveStart { get; set; }
    public DateTime? EffectiveEnd { get; set; }
    public bool IsCurrent { get; set; }
}

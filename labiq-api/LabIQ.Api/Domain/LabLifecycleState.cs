namespace LabIQ.Api.Domain;

public enum LabLifecycleState
{
    Draft,
    CatalogLoaded,
    MappingConfirmed,
    TestTransactionsConfirmed,
    Live,
    Suspended
}

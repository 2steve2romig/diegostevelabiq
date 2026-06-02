using LabIQ.Api.Data;
using LabIQ.Api.Endpoints;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<LabIqDbContext>(opt =>
    opt.UseSqlite("Data Source=labiq.db"));

builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<CatalogIngestionService>();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins("http://localhost:5173")
          .AllowAnyMethod()
          .AllowAnyHeader()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LabIqDbContext>();
    db.Database.EnsureCreated();
    SeedData.Initialize(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.MapLabEndpoints();
app.MapCatalogEndpoints();

app.Run();

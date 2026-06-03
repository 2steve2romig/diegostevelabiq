using LabIQ.Api.Data;
using LabIQ.Api.Endpoints;
using LabIQ.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Railway (and most cloud hosts) supply PORT at runtime
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://+:{port}");

// Use writable path for SQLite in containers; fallback to local for dev
var dbPath = Environment.GetEnvironmentVariable("DB_PATH") ?? "labiq.db";
builder.Services.AddDbContext<LabIqDbContext>(opt =>
    opt.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<CatalogIngestionService>();

// Allow localhost dev + any Vercel preview/production URL
var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries);

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyMethod()
          .AllowAnyHeader()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LabIqDbContext>();
    // Apply any pending migrations (creates the DB if it doesn't exist yet)
    db.Database.Migrate();
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
app.MapDashboardEndpoints();
app.MapMasterTestsEndpoints();
app.MapMasterAnalytesEndpoints();
app.MapOfferingsEndpoints();
app.MapAuditTrailEndpoints();

app.Run();

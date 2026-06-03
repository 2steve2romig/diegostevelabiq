using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabIQ.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditEvents",
                columns: table => new
                {
                    EventId = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    EventType = table.Column<string>(type: "TEXT", nullable: false),
                    TimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ActorId = table.Column<string>(type: "TEXT", nullable: false),
                    ActorRole = table.Column<string>(type: "TEXT", nullable: false),
                    LabId = table.Column<int>(type: "INTEGER", nullable: true),
                    LocationId = table.Column<int>(type: "INTEGER", nullable: true),
                    ObjectType = table.Column<string>(type: "TEXT", nullable: false),
                    ObjectId = table.Column<string>(type: "TEXT", nullable: true),
                    BeforeStateHash = table.Column<string>(type: "TEXT", nullable: true),
                    AfterStateHash = table.Column<string>(type: "TEXT", nullable: true),
                    Reason = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEvents", x => x.EventId);
                });

            migrationBuilder.CreateTable(
                name: "Labs",
                columns: table => new
                {
                    LabId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LabCompanyCode = table.Column<string>(type: "TEXT", nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", nullable: false),
                    PrimaryAddress = table.Column<string>(type: "TEXT", nullable: false),
                    PrimaryContact = table.Column<string>(type: "TEXT", nullable: false),
                    AccreditationBody = table.Column<string>(type: "TEXT", nullable: true),
                    AccreditationNumber = table.Column<string>(type: "TEXT", nullable: true),
                    SourceLims = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Labs", x => x.LabId);
                });

            migrationBuilder.CreateTable(
                name: "LabLocations",
                columns: table => new
                {
                    LocationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LabId = table.Column<int>(type: "INTEGER", nullable: false),
                    LabLocationCode = table.Column<string>(type: "TEXT", nullable: false),
                    Address = table.Column<string>(type: "TEXT", nullable: false),
                    TimeZone = table.Column<string>(type: "TEXT", nullable: false),
                    AvailableFrom = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabLocations", x => x.LocationId);
                    table.ForeignKey(
                        name: "FK_LabLocations_Labs_LabId",
                        column: x => x.LabId,
                        principalTable: "Labs",
                        principalColumn: "LabId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParameterCodes",
                columns: table => new
                {
                    ParameterCodeId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LabId = table.Column<int>(type: "INTEGER", nullable: false),
                    Code = table.Column<string>(type: "TEXT", nullable: false),
                    MethodCode = table.Column<string>(type: "TEXT", nullable: false),
                    MethodName = table.Column<string>(type: "TEXT", nullable: false),
                    DefaultUnit = table.Column<string>(type: "TEXT", nullable: true),
                    DefaultResultType = table.Column<string>(type: "TEXT", nullable: true),
                    ActiveFlag = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParameterCodes", x => x.ParameterCodeId);
                    table.ForeignKey(
                        name: "FK_ParameterCodes_Labs_LabId",
                        column: x => x.LabId,
                        principalTable: "Labs",
                        principalColumn: "LabId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TestCodes",
                columns: table => new
                {
                    TestCodeId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LabId = table.Column<int>(type: "INTEGER", nullable: false),
                    Code = table.Column<string>(type: "TEXT", nullable: false),
                    ActiveFlag = table.Column<bool>(type: "INTEGER", nullable: false),
                    Matrix = table.Column<string>(type: "TEXT", nullable: true),
                    SampleSize = table.Column<string>(type: "TEXT", nullable: true),
                    TestCategory = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestCodes", x => x.TestCodeId);
                    table.ForeignKey(
                        name: "FK_TestCodes_Labs_LabId",
                        column: x => x.LabId,
                        principalTable: "Labs",
                        principalColumn: "LabId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParameterDescriptions",
                columns: table => new
                {
                    ParameterDescriptionId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ParameterCodeId = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    EffectiveStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EffectiveEnd = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsCurrent = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParameterDescriptions", x => x.ParameterDescriptionId);
                    table.ForeignKey(
                        name: "FK_ParameterDescriptions_ParameterCodes_ParameterCodeId",
                        column: x => x.ParameterCodeId,
                        principalTable: "ParameterCodes",
                        principalColumn: "ParameterCodeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LocationTestAvailabilities",
                columns: table => new
                {
                    LocationId = table.Column<int>(type: "INTEGER", nullable: false),
                    TestCodeId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationTestAvailabilities", x => new { x.LocationId, x.TestCodeId });
                    table.ForeignKey(
                        name: "FK_LocationTestAvailabilities_LabLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "LabLocations",
                        principalColumn: "LocationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LocationTestAvailabilities_TestCodes_TestCodeId",
                        column: x => x.TestCodeId,
                        principalTable: "TestCodes",
                        principalColumn: "TestCodeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TestDescriptions",
                columns: table => new
                {
                    TestDescriptionId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TestCodeId = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    EffectiveStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EffectiveEnd = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsCurrent = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestDescriptions", x => x.TestDescriptionId);
                    table.ForeignKey(
                        name: "FK_TestDescriptions_TestCodes_TestCodeId",
                        column: x => x.TestCodeId,
                        principalTable: "TestCodes",
                        principalColumn: "TestCodeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TestParameterAssociations",
                columns: table => new
                {
                    TestCodeId = table.Column<int>(type: "INTEGER", nullable: false),
                    ParameterCodeId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestParameterAssociations", x => new { x.TestCodeId, x.ParameterCodeId });
                    table.ForeignKey(
                        name: "FK_TestParameterAssociations_ParameterCodes_ParameterCodeId",
                        column: x => x.ParameterCodeId,
                        principalTable: "ParameterCodes",
                        principalColumn: "ParameterCodeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TestParameterAssociations_TestCodes_TestCodeId",
                        column: x => x.TestCodeId,
                        principalTable: "TestCodes",
                        principalColumn: "TestCodeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LabLocations_LabId_LabLocationCode",
                table: "LabLocations",
                columns: new[] { "LabId", "LabLocationCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Labs_LabCompanyCode",
                table: "Labs",
                column: "LabCompanyCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocationTestAvailabilities_TestCodeId",
                table: "LocationTestAvailabilities",
                column: "TestCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_ParameterCodes_LabId_Code",
                table: "ParameterCodes",
                columns: new[] { "LabId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParameterDescriptions_ParameterCodeId",
                table: "ParameterDescriptions",
                column: "ParameterCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_TestCodes_LabId_Code",
                table: "TestCodes",
                columns: new[] { "LabId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TestDescriptions_TestCodeId",
                table: "TestDescriptions",
                column: "TestCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_TestParameterAssociations_ParameterCodeId",
                table: "TestParameterAssociations",
                column: "ParameterCodeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditEvents");

            migrationBuilder.DropTable(
                name: "LocationTestAvailabilities");

            migrationBuilder.DropTable(
                name: "ParameterDescriptions");

            migrationBuilder.DropTable(
                name: "TestDescriptions");

            migrationBuilder.DropTable(
                name: "TestParameterAssociations");

            migrationBuilder.DropTable(
                name: "LabLocations");

            migrationBuilder.DropTable(
                name: "ParameterCodes");

            migrationBuilder.DropTable(
                name: "TestCodes");

            migrationBuilder.DropTable(
                name: "Labs");
        }
    }
}

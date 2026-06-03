using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabIQ.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTestOrdersAndTransportChannels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TestOrders",
                columns: table => new
                {
                    TestOrderId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LocationId = table.Column<int>(type: "INTEGER", nullable: false),
                    SureTrendOrderId = table.Column<string>(type: "TEXT", nullable: false),
                    DispatchedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Mode = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    PayloadJson = table.Column<string>(type: "TEXT", nullable: true),
                    DispatchedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestOrders", x => x.TestOrderId);
                    table.ForeignKey(
                        name: "FK_TestOrders_LabLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "LabLocations",
                        principalColumn: "LocationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransportChannels",
                columns: table => new
                {
                    ChannelId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LocationId = table.Column<int>(type: "INTEGER", nullable: false),
                    ChannelType = table.Column<string>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    HostingMode = table.Column<string>(type: "TEXT", nullable: true),
                    Host = table.Column<string>(type: "TEXT", nullable: true),
                    Port = table.Column<int>(type: "INTEGER", nullable: true),
                    InboxPath = table.Column<string>(type: "TEXT", nullable: true),
                    OutboxPath = table.Column<string>(type: "TEXT", nullable: true),
                    ArchivePath = table.Column<string>(type: "TEXT", nullable: true),
                    PublicKeyFingerprint = table.Column<string>(type: "TEXT", nullable: true),
                    EndpointUrl = table.Column<string>(type: "TEXT", nullable: true),
                    AuthType = table.Column<string>(type: "TEXT", nullable: true),
                    EncryptionType = table.Column<string>(type: "TEXT", nullable: true),
                    RecipientAddress = table.Column<string>(type: "TEXT", nullable: true),
                    FileNamingTemplate = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransportChannels", x => x.ChannelId);
                    table.ForeignKey(
                        name: "FK_TransportChannels_LabLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "LabLocations",
                        principalColumn: "LocationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TestResults",
                columns: table => new
                {
                    TestResultId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TestOrderId = table.Column<int>(type: "INTEGER", nullable: false),
                    LabSampleCode = table.Column<string>(type: "TEXT", nullable: true),
                    ClientSampleCode = table.Column<string>(type: "TEXT", nullable: true),
                    ReceivedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    BoundAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    AnalyteCodesMatch = table.Column<bool>(type: "INTEGER", nullable: false),
                    ResultPayloadJson = table.Column<string>(type: "TEXT", nullable: true),
                    ValidationNotes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestResults", x => x.TestResultId);
                    table.ForeignKey(
                        name: "FK_TestResults_TestOrders_TestOrderId",
                        column: x => x.TestOrderId,
                        principalTable: "TestOrders",
                        principalColumn: "TestOrderId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InboundFileAcknowledgments",
                columns: table => new
                {
                    AckId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ChannelId = table.Column<int>(type: "INTEGER", nullable: false),
                    OriginalFileName = table.Column<string>(type: "TEXT", nullable: false),
                    ReceivedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReceivedByIdentity = table.Column<string>(type: "TEXT", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    Sha256Checksum = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboundFileAcknowledgments", x => x.AckId);
                    table.ForeignKey(
                        name: "FK_InboundFileAcknowledgments_TransportChannels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "TransportChannels",
                        principalColumn: "ChannelId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InboundFileAcknowledgments_ChannelId",
                table: "InboundFileAcknowledgments",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_TestOrders_LocationId",
                table: "TestOrders",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_TestResults_TestOrderId",
                table: "TestResults",
                column: "TestOrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportChannels_LocationId_ChannelType",
                table: "TransportChannels",
                columns: new[] { "LocationId", "ChannelType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InboundFileAcknowledgments");

            migrationBuilder.DropTable(
                name: "TestResults");

            migrationBuilder.DropTable(
                name: "TransportChannels");

            migrationBuilder.DropTable(
                name: "TestOrders");
        }
    }
}

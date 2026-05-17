using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduledInstances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScheduledInstances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    ListItemId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledInstances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScheduledInstances_ListItems_ListItemId",
                        column: x => x.ListItemId,
                        principalTable: "ListItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledInstances_ListItemId",
                table: "ScheduledInstances",
                column: "ListItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScheduledInstances");
        }
    }
}

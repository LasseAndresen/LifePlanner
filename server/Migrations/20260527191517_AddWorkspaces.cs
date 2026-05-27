using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "ScheduledInstances",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Categories",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Cards",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Workspaces",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workspaces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkspaceUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkspaceUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkspaceUsers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkspaceUsers_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledInstances_WorkspaceId",
                table: "ScheduledInstances",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_WorkspaceId",
                table: "Categories",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_Cards_WorkspaceId",
                table: "Cards",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkspaceUsers_UserId",
                table: "WorkspaceUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkspaceUsers_WorkspaceId_UserId",
                table: "WorkspaceUsers",
                columns: new[] { "WorkspaceId", "UserId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Workspaces_WorkspaceId",
                table: "Cards",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Workspaces_WorkspaceId",
                table: "Categories",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledInstances_Workspaces_WorkspaceId",
                table: "ScheduledInstances",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // Data Migration: Seed default workspaces and link existing records
            migrationBuilder.Sql("INSERT INTO Workspaces (Name) SELECT 'WS_USER_' || Id FROM Users;");
            migrationBuilder.Sql("INSERT INTO WorkspaceUsers (WorkspaceId, UserId, Role) SELECT w.Id, u.Id, 'Owner' FROM Users u JOIN Workspaces w ON w.Name = 'WS_USER_' || u.Id;");
            migrationBuilder.Sql("UPDATE Cards SET WorkspaceId = (SELECT w.Id FROM Workspaces w WHERE w.Name = 'WS_USER_' || Cards.UserId);");
            migrationBuilder.Sql("UPDATE Categories SET WorkspaceId = (SELECT w.Id FROM Workspaces w WHERE w.Name = 'WS_USER_' || Categories.UserId);");
            migrationBuilder.Sql("UPDATE ScheduledInstances SET WorkspaceId = (SELECT w.Id FROM Workspaces w WHERE w.Name = 'WS_USER_' || ScheduledInstances.UserId);");
            migrationBuilder.Sql("UPDATE Workspaces SET Name = (SELECT u.Name || '''s Workspace' FROM Users u WHERE 'WS_USER_' || u.Id = Workspaces.Name) WHERE Name LIKE 'WS_USER_%';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Workspaces_WorkspaceId",
                table: "Cards");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Workspaces_WorkspaceId",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledInstances_Workspaces_WorkspaceId",
                table: "ScheduledInstances");

            migrationBuilder.DropTable(
                name: "WorkspaceUsers");

            migrationBuilder.DropTable(
                name: "Workspaces");

            migrationBuilder.DropIndex(
                name: "IX_ScheduledInstances_WorkspaceId",
                table: "ScheduledInstances");

            migrationBuilder.DropIndex(
                name: "IX_Categories_WorkspaceId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Cards_WorkspaceId",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Cards");
        }
    }
}

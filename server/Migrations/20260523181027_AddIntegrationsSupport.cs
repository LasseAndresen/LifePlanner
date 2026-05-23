using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIntegrationsSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "GoogleKeepConnected",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "MicrosoftTodoConnected",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "IntegrationExternalId",
                table: "ListItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntegrationExternalId",
                table: "Cards",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntegrationSource",
                table: "Cards",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoogleKeepConnected",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MicrosoftTodoConnected",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IntegrationExternalId",
                table: "ListItems");

            migrationBuilder.DropColumn(
                name: "IntegrationExternalId",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "IntegrationSource",
                table: "Cards");
        }
    }
}

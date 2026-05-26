using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStickyNotesSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Cards",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsStickyNote",
                table: "Cards",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "IsStickyNote",
                table: "Cards");
        }
    }
}

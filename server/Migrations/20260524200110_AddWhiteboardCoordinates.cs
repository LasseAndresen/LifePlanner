using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWhiteboardCoordinates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "WhiteboardX",
                table: "Cards",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "WhiteboardY",
                table: "Cards",
                type: "REAL",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WhiteboardX",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "WhiteboardY",
                table: "Cards");
        }
    }
}

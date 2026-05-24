using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStandaloneCalendarEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledInstances_ListItems_ListItemId",
                table: "ScheduledInstances");

            migrationBuilder.AlterColumn<int>(
                name: "ListItemId",
                table: "ScheduledInstances",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                table: "ScheduledInstances",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ScheduledInstances",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndTime",
                table: "ScheduledInstances",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartTime",
                table: "ScheduledInstances",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "ScheduledInstances",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ScheduledInstances",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "ScheduledInstances",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledInstances_CategoryId",
                table: "ScheduledInstances",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledInstances_UserId",
                table: "ScheduledInstances",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledInstances_Categories_CategoryId",
                table: "ScheduledInstances",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledInstances_ListItems_ListItemId",
                table: "ScheduledInstances",
                column: "ListItemId",
                principalTable: "ListItems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledInstances_Users_UserId",
                table: "ScheduledInstances",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledInstances_Categories_CategoryId",
                table: "ScheduledInstances");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledInstances_ListItems_ListItemId",
                table: "ScheduledInstances");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledInstances_Users_UserId",
                table: "ScheduledInstances");

            migrationBuilder.DropIndex(
                name: "IX_ScheduledInstances_CategoryId",
                table: "ScheduledInstances");

            migrationBuilder.DropIndex(
                name: "IX_ScheduledInstances_UserId",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ScheduledInstances");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ScheduledInstances");

            migrationBuilder.AlterColumn<int>(
                name: "ListItemId",
                table: "ScheduledInstances",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledInstances_ListItems_ListItemId",
                table: "ScheduledInstances",
                column: "ListItemId",
                principalTable: "ListItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

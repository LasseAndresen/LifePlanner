using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Data;

public class LifePlannerDbContext : DbContext
{
    public LifePlannerDbContext(DbContextOptions<LifePlannerDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Card> Cards { get; set; } = null!;
    public DbSet<ListItem> ListItems { get; set; } = null!;
    public DbSet<ScheduledInstance> ScheduledInstances { get; set; } = null!;
    public DbSet<Feedback> Feedback { get; set; } = null!;
    public DbSet<Workspace> Workspaces { get; set; } = null!;
    public DbSet<WorkspaceUser> WorkspaceUsers { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Composite key for WorkspaceUser
        modelBuilder.Entity<WorkspaceUser>()
            .HasIndex(wu => new { wu.WorkspaceId, wu.UserId })
            .IsUnique();

        // Configure cascade deletes or constraints if needed
        modelBuilder.Entity<WorkspaceUser>()
            .HasOne(wu => wu.Workspace)
            .WithMany(w => w.WorkspaceUsers)
            .HasForeignKey(wu => wu.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WorkspaceUser>()
            .HasOne(wu => wu.User)
            .WithMany()
            .HasForeignKey(wu => wu.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Card>()
            .HasOne(c => c.Workspace)
            .WithMany(w => w.Cards)
            .HasForeignKey(c => c.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Category>()
            .HasOne(c => c.Workspace)
            .WithMany(w => w.Categories)
            .HasForeignKey(c => c.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ScheduledInstance>()
            .HasOne(si => si.Workspace)
            .WithMany(w => w.ScheduledInstances)
            .HasForeignKey(si => si.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

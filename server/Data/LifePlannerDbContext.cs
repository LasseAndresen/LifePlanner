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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Define any explicit relationships or constraints here
        // The foreign keys in the models handle most of this by convention.
    }
}

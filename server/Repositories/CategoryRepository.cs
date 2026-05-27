using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(LifePlannerDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Category>> GetCategoriesByWorkspaceIdAsync(int workspaceId)
    {
        return await _dbSet
            .Where(c => c.WorkspaceId == workspaceId)
            .ToListAsync();
    }
}

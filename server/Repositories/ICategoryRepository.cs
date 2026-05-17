using LifePlanner.Api.Models;

namespace LifePlanner.Api.Repositories;

public interface ICategoryRepository : IRepository<Category>
{
    Task<IEnumerable<Category>> GetCategoriesByUserIdAsync(int userId);
}

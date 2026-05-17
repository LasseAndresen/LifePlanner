using LifePlanner.Api.Models;

namespace LifePlanner.Api.Repositories;

public interface ICardRepository : IRepository<Card>
{
    Task<IEnumerable<Card>> GetCardsByUserIdAsync(int userId);
    Task<Card?> GetCardWithCategoryByIdAsync(int id);
}

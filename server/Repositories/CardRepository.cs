using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Repositories;

public class CardRepository : Repository<Card>, ICardRepository
{
    public CardRepository(LifePlannerDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Card>> GetCardsByUserIdAsync(int userId)
    {
        return await _dbSet
            .Include(c => c.Category)
            .Include(c => c.ListItems)
            .Where(c => c.UserId == userId)
            .ToListAsync();
    }

    public async Task<Card?> GetCardWithCategoryByIdAsync(int id)
    {
        return await _dbSet
            .Include(c => c.Category)
            .Include(c => c.ListItems)
            .FirstOrDefaultAsync(c => c.Id == id);
    }
}

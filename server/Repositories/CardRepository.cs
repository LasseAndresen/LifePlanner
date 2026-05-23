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
                .ThenInclude(i => i.ScheduledInstances)
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Order)
            .ToListAsync();
    }

    public async Task<Card?> GetCardWithCategoryByIdAsync(int id)
    {
        return await _dbSet
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(i => i.ScheduledInstances)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public override async Task AddAsync(Card card)
    {
        // Find the current max order for this user's cards
        var maxOrder = await _dbSet
            .Where(c => c.UserId == card.UserId)
            .Select(c => (int?)c.Order)
            .MaxAsync();

        card.Order = (maxOrder ?? -1) + 1;

        await base.AddAsync(card);
    }

    public async Task ReorderCardsAsync(IEnumerable<ReorderCardsDto> reorderedCards)
    {
        foreach (var rc in reorderedCards)
        {
            var card = await _dbSet.FirstOrDefaultAsync(c => c.Id == rc.Id);
            if (card != null)
            {
                card.Order = rc.Order;
            }
        }
        await _context.SaveChangesAsync();
    }
}



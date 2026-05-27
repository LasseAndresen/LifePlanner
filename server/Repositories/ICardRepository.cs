using LifePlanner.Api.Models;

namespace LifePlanner.Api.Repositories;

public interface ICardRepository : IRepository<Card>
{
    Task<IEnumerable<Card>> GetCardsByWorkspaceIdAsync(int workspaceId);
    Task<Card?> GetCardWithCategoryByIdAsync(int id);
    Task ReorderCardsAsync(IEnumerable<ReorderCardsDto> reorderedCards);
}

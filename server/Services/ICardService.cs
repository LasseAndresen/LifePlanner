using System.Collections.Generic;
using System.Threading.Tasks;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface ICardService
{
    Task<IEnumerable<CardDto>> GetCardsByWorkspaceIdAsync(int workspaceId);
    Task<CardDto?> CreateCardAsync(Card card);
    Task<CardDto?> UpdateCardAsync(int id, Card updatedCard);
    Task<bool> DeleteCardAsync(int id);
    Task ReorderCardsAsync(List<ReorderCardsDto> reordered);

    Task<ListItemDto?> AddListItemAsync(int cardId, ListItem item);
    Task<ListItemDto?> UpdateListItemAsync(int cardId, int itemId, ListItem updatedItem);
    Task<bool> DeleteListItemAsync(int cardId, int itemId);
    Task<CardDto?> ReorderListItemsAsync(int cardId, ReorderItemsRequest request);

    Task<ScheduledInstanceDto?> CreateScheduledInstanceAsync(ScheduledInstance instanceReq);
    Task<ScheduledInstanceDto?> UpdateScheduledInstanceAsync(int id, ScheduledInstance updatedInstance);
    Task<bool> DeleteScheduledInstanceAsync(int id);
    Task<IEnumerable<ScheduledInstanceDto>> GetScheduledInstancesByWorkspaceIdAsync(int workspaceId);
}

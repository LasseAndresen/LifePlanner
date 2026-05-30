using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Services;

public class CardService : ICardService
{
    private readonly LifePlannerDbContext _db;
    private readonly ICardRepository _cardRepo;
    private readonly IMicrosoftTodoService _todoService;
    private readonly IGoogleTasksService _googleTasksService;
    private readonly IGoogleCalendarService _calendarService;
    private readonly ILogger<CardService> _logger;

    public CardService(
        LifePlannerDbContext db,
        ICardRepository cardRepo,
        IMicrosoftTodoService todoService,
        IGoogleTasksService googleTasksService,
        IGoogleCalendarService calendarService,
        ILogger<CardService> logger)
    {
        _db = db;
        _cardRepo = cardRepo;
        _todoService = todoService;
        _googleTasksService = googleTasksService;
        _calendarService = calendarService;
        _logger = logger;
    }

    public async Task<IEnumerable<CardDto>> GetCardsByWorkspaceIdAsync(int workspaceId)
    {
        var cards = await _cardRepo.GetCardsByWorkspaceIdAsync(workspaceId);
        return cards.Select(ToDto);
    }

    public async Task<CardDto?> CreateCardAsync(Card card)
    {
        if (string.IsNullOrWhiteSpace(card.Title) || !card.WorkspaceId.HasValue || card.WorkspaceId.Value <= 0 || card.CategoryId <= 0)
        {
            return null;
        }

        await _cardRepo.AddAsync(card);

        var createdEntity = await _cardRepo.GetCardWithCategoryByIdAsync(card.Id);
        if (createdEntity == null) return null;

        return ToDto(createdEntity);
    }

    public async Task<CardDto?> UpdateCardAsync(int id, Card updatedCard)
    {
        if (string.IsNullOrWhiteSpace(updatedCard.Title) || updatedCard.CategoryId <= 0)
        {
            return null;
        }

        var card = await _cardRepo.GetByIdAsync(id);
        if (card is null) return null;

        card.Title = updatedCard.Title;
        card.Description = updatedCard.Description;
        card.CategoryId = updatedCard.CategoryId;
        card.ScheduledDate = updatedCard.ScheduledDate;
        card.IsChecklist = updatedCard.IsChecklist;
        card.WhiteboardX = updatedCard.WhiteboardX;
        card.WhiteboardY = updatedCard.WhiteboardY;
        card.IsStickyNote = updatedCard.IsStickyNote;
        card.Color = updatedCard.Color;

        await _cardRepo.UpdateAsync(card);

        var resultEntity = await _cardRepo.GetCardWithCategoryByIdAsync(id);
        if (resultEntity == null) return null;

        return ToDto(resultEntity);
    }

    public async Task<bool> DeleteCardAsync(int id)
    {
        var card = await _db.Cards
            .Include(c => c.ListItems)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (card is null) return false;

        var listItemIds = card.ListItems.Select(li => li.Id).ToList();
        if (listItemIds.Any())
        {
            var scheduledInstances = await _db.ScheduledInstances
                .Include(si => si.ListItem)
                .Where(si => si.ListItemId.HasValue && listItemIds.Contains(si.ListItemId.Value))
                .ToListAsync();
            foreach (var si in scheduledInstances)
            {
                if (si.ListItem != null)
                {
                    if (string.IsNullOrEmpty(si.Title))
                    {
                        si.Title = si.ListItem.Text;
                    }
                    if (!si.CategoryId.HasValue)
                    {
                        si.CategoryId = card.CategoryId;
                    }
                }
                si.ListItemId = null;
            }
        }

        _db.Cards.Remove(card);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task ReorderCardsAsync(List<ReorderCardsDto> reordered)
    {
        await _cardRepo.ReorderCardsAsync(reordered ?? new List<ReorderCardsDto>());
    }

    // --- List Item methods ---

    public async Task<ListItemDto?> AddListItemAsync(int cardId, ListItem item)
    {
        var card = await _db.Cards.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == cardId);
        if (card is null) return null;

        item.CardId = cardId;

        if (card.IntegrationSource == "MicrosoftTodo" && 
            !string.IsNullOrEmpty(card.IntegrationExternalId) && 
            card.User != null && card.User.MicrosoftTodoConnected)
        {
            try
            {
                var accessToken = await _todoService.GetOrRefreshTokenAsync(card.User);
                var externalId = await _todoService.CreateTaskAsync(accessToken, card.IntegrationExternalId, item.Text);
                item.IntegrationExternalId = externalId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task in Microsoft To-Do for CardId {CardId}", cardId);
            }
        }
        else if (card.IntegrationSource == "GoogleTasks" &&
                 !string.IsNullOrEmpty(card.IntegrationExternalId) &&
                 card.User != null && card.User.GoogleTasksConnected)
        {
            try
            {
                var googleTask = await _googleTasksService.CreateTaskAsync(card.User, card.IntegrationExternalId, item.Text);
                item.IntegrationExternalId = googleTask.Id;
                item.Position = googleTask.Position;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task in Google Tasks for CardId {CardId}", cardId);
            }
        }

        _db.ListItems.Add(item);
        await _db.SaveChangesAsync();

        return ToItemDto(item);
    }

    public async Task<ListItemDto?> UpdateListItemAsync(int cardId, int itemId, ListItem updatedItem)
    {
        var item = await _db.ListItems
            .Include(i => i.ScheduledInstances)
            .Include(i => i.Card)
                .ThenInclude(c => c!.User)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
        if (item is null) return null;

        bool completionChanged = item.IsCompleted != updatedItem.IsCompleted;
        bool renameChanged = item.Text != updatedItem.Text;

        _logger.LogInformation("Item Put Request - ItemId: {ItemId}, CardId: {CardId}, Text: '{OldText}' -> '{NewText}', renameChanged: {RenameChanged}, completionChanged: {CompletionChanged}", 
            itemId, cardId, item.Text, updatedItem.Text, renameChanged, completionChanged);

        item.Text = updatedItem.Text;
        item.IsCompleted = updatedItem.IsCompleted;
        if (updatedItem.CardId > 0 && updatedItem.CardId != cardId)
        {
            item.CardId = updatedItem.CardId;
        }

        // Sync rename and completion to all linked scheduled instances in the DB
        if (item.ScheduledInstances != null)
        {
            foreach (var inst in item.ScheduledInstances)
            {
                inst.Title = updatedItem.Text;
                inst.IsCompleted = updatedItem.IsCompleted;
            }
        }

        if ((completionChanged || renameChanged) && item.Card?.IntegrationSource == "MicrosoftTodo" &&
            !string.IsNullOrEmpty(item.IntegrationExternalId) &&
            !string.IsNullOrEmpty(item.Card.IntegrationExternalId) &&
            item.Card.User != null && item.Card.User.MicrosoftTodoConnected)
        {
            try
            {
                var accessToken = await _todoService.GetOrRefreshTokenAsync(item.Card.User);
                await _todoService.UpdateTaskAsync(
                    accessToken, 
                    item.Card.IntegrationExternalId, 
                    item.IntegrationExternalId, 
                    title: renameChanged ? item.Text : null, 
                    isCompleted: completionChanged ? (bool?)item.IsCompleted : null
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing task update with Microsoft To-Do for ItemId {ItemId}", itemId);
            }
        }
        else if ((completionChanged || renameChanged) && item.Card?.IntegrationSource == "GoogleTasks" &&
                 !string.IsNullOrEmpty(item.IntegrationExternalId) &&
                 !string.IsNullOrEmpty(item.Card.IntegrationExternalId) &&
                 item.Card.User != null && item.Card.User.GoogleTasksConnected)
        {
            try
            {
                await _googleTasksService.UpdateTaskAsync(
                    item.Card.User,
                    item.Card.IntegrationExternalId,
                    item.IntegrationExternalId,
                    title: renameChanged ? item.Text : null,
                    isCompleted: completionChanged ? (bool?)item.IsCompleted : null
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing task update with Google Tasks for ItemId {ItemId}", itemId);
            }
        }

        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<bool> DeleteListItemAsync(int cardId, int itemId)
    {
        var item = await _db.ListItems
            .Include(i => i.Card)
                .ThenInclude(c => c!.User)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
        if (item is null) return false;

        if (item.Card?.IntegrationSource == "MicrosoftTodo" && 
            !string.IsNullOrEmpty(item.IntegrationExternalId) && 
            !string.IsNullOrEmpty(item.Card.IntegrationExternalId) && 
            item.Card.User != null && item.Card.User.MicrosoftTodoConnected)
        {
            try
            {
                var accessToken = await _todoService.GetOrRefreshTokenAsync(item.Card.User);
                await _todoService.DeleteTaskAsync(accessToken, item.Card.IntegrationExternalId, item.IntegrationExternalId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task from Microsoft To-Do for ItemId {ItemId}", itemId);
            }
        }
        else if (item.Card?.IntegrationSource == "GoogleTasks" && 
                 !string.IsNullOrEmpty(item.IntegrationExternalId) && 
                 !string.IsNullOrEmpty(item.Card.IntegrationExternalId) && 
                 item.Card.User != null && item.Card.User.GoogleTasksConnected)
        {
            try
            {
                await _googleTasksService.DeleteTaskAsync(item.Card.User, item.Card.IntegrationExternalId, item.IntegrationExternalId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task from Google Tasks for ItemId {ItemId}", itemId);
            }
        }

        // Orphan any scheduled instances first instead of deleting them
        var scheduledInstances = await _db.ScheduledInstances
            .Include(si => si.ListItem)
                .ThenInclude(li => li!.Card)
            .Where(si => si.ListItemId == itemId)
            .ToListAsync();
        foreach (var si in scheduledInstances)
        {
            if (si.ListItem != null)
            {
                if (string.IsNullOrEmpty(si.Title))
                {
                    si.Title = si.ListItem.Text;
                }
                if (!si.CategoryId.HasValue && si.ListItem.Card != null)
                {
                    si.CategoryId = si.ListItem.Card.CategoryId;
                }
            }
            si.ListItemId = null;
        }

        _db.ListItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<CardDto?> ReorderListItemsAsync(int cardId, ReorderItemsRequest request)
    {
        var card = await _db.Cards
            .Include(c => c.ListItems)
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == cardId);

        if (card == null) return null;

        if (card.IntegrationSource == "GoogleTasks" &&
            !string.IsNullOrEmpty(card.IntegrationExternalId) &&
            card.User != null && card.User.GoogleTasksConnected)
        {
            var movedItem = card.ListItems.FirstOrDefault(li => li.Id == request.MovedItemId);
            if (movedItem != null && !string.IsNullOrEmpty(movedItem.IntegrationExternalId))
            {
                int movedIndex = request.ItemIds.IndexOf(request.MovedItemId);
                string? previousTaskExtId = null;
                if (movedIndex > 0)
                {
                    var prevItemId = request.ItemIds[movedIndex - 1];
                    var prevItem = card.ListItems.FirstOrDefault(li => li.Id == prevItemId);
                    previousTaskExtId = prevItem?.IntegrationExternalId;
                }

                try
                {
                    await _googleTasksService.MoveTaskAsync(
                        card.User,
                        card.IntegrationExternalId,
                        movedItem.IntegrationExternalId,
                        previousTaskExtId
                    );

                    var freshTasks = await _googleTasksService.GetTasksAsync(card.User, card.IntegrationExternalId);
                    foreach (var task in freshTasks)
                    {
                        var dbItem = card.ListItems.FirstOrDefault(li => li.IntegrationExternalId == task.Id);
                        if (dbItem != null)
                        {
                            dbItem.Position = task.Position;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error moving task in Google Tasks for CardId {CardId}, ItemId {ItemId}", cardId, request.MovedItemId);
                }
            }
        }

        // Always update local positions for non-GoogleTasks items
        if (card.IntegrationSource != "GoogleTasks")
        {
            for (int i = 0; i < request.ItemIds.Count; i++)
            {
                var itemId = request.ItemIds[i];
                var item = card.ListItems.FirstOrDefault(li => li.Id == itemId);
                if (item != null)
                {
                    item.Position = i.ToString("D10");
                }
            }
        }

        await _db.SaveChangesAsync();
        return ToDto(card);
    }

    // --- Scheduled Instance endpoints ---

    public async Task<ScheduledInstanceDto?> CreateScheduledInstanceAsync(ScheduledInstance instanceReq)
    {
        if (!instanceReq.WorkspaceId.HasValue || instanceReq.WorkspaceId.Value <= 0 || instanceReq.UserId <= 0)
        {
            return null;
        }

        if (instanceReq.ListItemId.HasValue)
        {
            var item = await _db.ListItems.Include(li => li.Card).FirstOrDefaultAsync(li => li.Id == instanceReq.ListItemId.Value);
            if (item == null) return null;
            
            instanceReq.Title = item.Text;
        }

        _db.ScheduledInstances.Add(instanceReq);
        await _db.SaveChangesAsync();

        var reloaded = await _db.ScheduledInstances
            .Include(si => si.Category)
            .Include(si => si.ListItem)
                .ThenInclude(li => li!.Card)
                    .ThenInclude(c => c!.Category)
            .FirstAsync(si => si.Id == instanceReq.Id);

        return ToInstanceDto(reloaded);
    }

    public async Task<ScheduledInstanceDto?> UpdateScheduledInstanceAsync(int id, ScheduledInstance updatedInstance)
    {
        var inst = await _db.ScheduledInstances
            .Include(si => si.ListItem)
                .ThenInclude(li => li!.Card)
                    .ThenInclude(c => c!.User)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (inst is null) return null;

        bool completionChanged = inst.IsCompleted != updatedInstance.IsCompleted;
        bool confirmationStatusChanged = inst.IsConfirmed != updatedInstance.IsConfirmed;
        bool isNowConfirmed = updatedInstance.IsConfirmed;

        inst.Date = updatedInstance.Date;
        inst.IsCompleted = updatedInstance.IsCompleted;
        inst.Title = updatedInstance.Title;
        inst.Description = updatedInstance.Description;
        inst.Type = updatedInstance.Type;
        inst.StartTime = updatedInstance.StartTime;
        inst.EndTime = updatedInstance.EndTime;
        inst.CategoryId = updatedInstance.CategoryId;
        inst.ListItemId = updatedInstance.ListItemId;
        inst.IsConfirmed = updatedInstance.IsConfirmed;

        if (completionChanged && inst.ListItem != null)
        {
            inst.ListItem.IsCompleted = updatedInstance.IsCompleted;

            // Sync to all other scheduled instances of the same list item
            var otherInstances = await _db.ScheduledInstances
                .Where(si => si.ListItemId == inst.ListItemId && si.Id != inst.Id)
                .ToListAsync();
            foreach (var other in otherInstances)
            {
                other.IsCompleted = updatedInstance.IsCompleted;
            }

            var card = inst.ListItem.Card;
            if (card?.IntegrationSource == "MicrosoftTodo" &&
                !string.IsNullOrEmpty(inst.ListItem.IntegrationExternalId) &&
                !string.IsNullOrEmpty(card.IntegrationExternalId) &&
                card.User != null && card.User.MicrosoftTodoConnected)
            {
                try
                {
                    var accessToken = await _todoService.GetOrRefreshTokenAsync(card.User);
                    await _todoService.UpdateTaskAsync(accessToken, card.IntegrationExternalId, inst.ListItem.IntegrationExternalId, isCompleted: updatedInstance.IsCompleted);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing task completion with Microsoft To-Do for InstanceId {InstanceId}", id);
                }
            }
            else if (card?.IntegrationSource == "GoogleTasks" &&
                     !string.IsNullOrEmpty(inst.ListItem.IntegrationExternalId) &&
                     !string.IsNullOrEmpty(card.IntegrationExternalId) &&
                     card.User != null && card.User.GoogleTasksConnected)
            {
                try
                {
                    await _googleTasksService.UpdateTaskAsync(card.User, card.IntegrationExternalId, inst.ListItem.IntegrationExternalId, isCompleted: updatedInstance.IsCompleted);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing task completion with Google Tasks for InstanceId {InstanceId}", id);
                }
            }
        }

        // Sync to Google Calendar
        if (isNowConfirmed)
        {
            var user = await _db.Users.FindAsync(inst.UserId);
            if (user != null && !string.IsNullOrEmpty(user.GoogleAccessToken))
            {
                try
                {
                    if (string.IsNullOrEmpty(inst.GoogleEventId))
                    {
                        var eventId = await _calendarService.CreateEventAsync(user, inst);
                        inst.GoogleEventId = eventId;
                    }
                    else
                    {
                        await _calendarService.UpdateEventAsync(user, inst);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing to Google Calendar for InstanceId {InstanceId}", id);
                }
            }
        }
        else if (confirmationStatusChanged && !isNowConfirmed)
        {
            var user = await _db.Users.FindAsync(inst.UserId);
            if (user != null && !string.IsNullOrEmpty(user.GoogleAccessToken) && !string.IsNullOrEmpty(inst.GoogleEventId))
            {
                try
                {
                    await _calendarService.DeleteEventAsync(user, inst.GoogleEventId);
                    inst.GoogleEventId = null;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting Google Calendar event for InstanceId {InstanceId}", id);
                }
            }
        }

        await _db.SaveChangesAsync();

        // Reload it back with includes
        var reloaded = await _db.ScheduledInstances
            .Include(si => si.Category)
            .Include(si => si.ListItem)
                .ThenInclude(li => li!.Card)
                    .ThenInclude(c => c!.Category)
            .FirstAsync(si => si.Id == id);

        return ToInstanceDto(reloaded);
    }

    public async Task<bool> DeleteScheduledInstanceAsync(int id)
    {
        var inst = await _db.ScheduledInstances.FirstOrDefaultAsync(s => s.Id == id);
        if (inst is null) return false;

        if (inst.IsConfirmed && !string.IsNullOrEmpty(inst.GoogleEventId))
        {
            var user = await _db.Users.FindAsync(inst.UserId);
            if (user != null && !string.IsNullOrEmpty(user.GoogleAccessToken))
            {
                try
                {
                    await _calendarService.DeleteEventAsync(user, inst.GoogleEventId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting Google Calendar event for InstanceId {InstanceId}", id);
                }
            }
        }

        _db.ScheduledInstances.Remove(inst);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<ScheduledInstanceDto>> GetScheduledInstancesByWorkspaceIdAsync(int workspaceId)
    {
        var instances = await _db.ScheduledInstances
            .Include(si => si.Category)
            .Include(si => si.ListItem)
                .ThenInclude(li => li!.Card)
                    .ThenInclude(c => c!.Category)
            .Where(si => si.WorkspaceId == workspaceId)
            .ToListAsync();
        return instances.Select(ToInstanceDto);
    }

    // --- DTO Mappers ---

    private static CardDto ToDto(Card c) => new()
    {
        Id = c.Id,
        Order = c.Order,
        Title = c.Title,
        Description = c.Description,
        ScheduledDate = c.ScheduledDate,
        IsChecklist = c.IsChecklist,
        ListItems = c.ListItems
            .OrderBy(li => li.Position)
            .ThenByDescending(li => li.Id)
            .Select(ToItemDto)
            .ToList(),
        CategoryId = c.CategoryId,
        UserId = c.UserId,
        WorkspaceId = c.WorkspaceId ?? 0,
        IntegrationSource = c.IntegrationSource,
        IntegrationExternalId = c.IntegrationExternalId,
        WhiteboardX = c.WhiteboardX,
        WhiteboardY = c.WhiteboardY,
        IsStickyNote = c.IsStickyNote,
        Color = c.Color,
        Category = c.Category != null ? new CategoryDto
        {
            Id = c.Category.Id,
            Name = c.Category.Name,
            Color = c.Category.Color
        } : null
    };

    private static ListItemDto ToItemDto(ListItem i) => new()
    {
        Id = i.Id,
        Text = i.Text,
        IsCompleted = i.IsCompleted,
        CardId = i.CardId,
        IntegrationExternalId = i.IntegrationExternalId,
        Position = i.Position,
        ScheduledInstances = i.ScheduledInstances?.Select(ToInstanceDto).ToList() ?? new()
    };

    private static ScheduledInstanceDto ToInstanceDto(ScheduledInstance inst) => new()
    {
        Id = inst.Id,
        Date = inst.Date,
        IsCompleted = inst.IsCompleted,
        UserId = inst.UserId,
        WorkspaceId = inst.WorkspaceId ?? 0,
        ListItemId = inst.ListItemId,
        CategoryId = inst.CategoryId,
        Title = inst.ListItem?.Text ?? inst.Title,
        Description = inst.Description,
        Type = inst.Type,
        StartTime = inst.StartTime,
        EndTime = inst.EndTime,
        IsConfirmed = inst.IsConfirmed,
        GoogleEventId = inst.GoogleEventId,
        Category = inst.Category != null ? new CategoryDto
        {
            Id = inst.Category.Id,
            Name = inst.Category.Name,
            Color = inst.Category.Color
        } : (inst.ListItem?.Card?.Category != null ? new CategoryDto
        {
            Id = inst.ListItem.Card.Category.Id,
            Name = inst.ListItem.Card.Category.Name,
            Color = inst.ListItem.Card.Category.Color
        } : null),
        ParentCardTitle = inst.ListItem?.Card?.Title,
        IntegrationSource = inst.ListItem?.Card?.IntegrationSource
    };
}

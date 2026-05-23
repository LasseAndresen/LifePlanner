using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public class IntegrationService : IIntegrationService
{
    private readonly LifePlannerDbContext _context;

    public IntegrationService(LifePlannerDbContext context)
    {
        _context = context;
    }

    private static readonly List<KeepNoteDto> MockKeepNotes = new()
    {
        new KeepNoteDto
        {
            Id = "keep-1",
            Title = "💡 Side Project Ideas",
            Items = new List<string> { "Research Angular 19 signals", "Set up SQLite database with migrations", "Design landing page mockup" }
        },
        new KeepNoteDto
        {
            Id = "keep-2",
            Title = "🛒 Weekly Groceries",
            Items = new List<string> { "Fresh organic bananas", "Almond milk (unsweetened)", "Sourdough bread", "Greek yogurt", "Avocado" }
        },
        new KeepNoteDto
        {
            Id = "keep-3",
            Title = "🏠 Weekend Home Improvement",
            Items = new List<string> { "Repaint the guest room", "Fix the squeaky kitchen drawer", "Organize garage shelves", "Water lawn & plants" }
        },
        new KeepNoteDto
        {
            Id = "keep-4",
            Title = "🎒 Gym Packing Checklist",
            Items = new List<string> { "Clean workout clothes", "Insulated water bottle", "Microfiber towel", "Lock for locker" }
        }
    };

    private static readonly List<(string Id, string Text)> MockTodoTasks = new()
    {
        ("ms-todo-1", "Buy fresh milk & oatmeal"),
        ("ms-todo-2", "Schedule annual dental cleaning"),
        ("ms-todo-3", "Prepare slide deck for Monday review"),
        ("ms-todo-4", "Renew car insurance plan"),
        ("ms-todo-5", "Pick up package from post office locker")
    };

    public async Task<IntegrationStatusDto> GetStatusAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return new IntegrationStatusDto(false, false);

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleKeepConnected);
    }

    public async Task<IntegrationStatusDto> ConnectAsync(int userId, string provider)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new KeyNotFoundException("User not found");

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = true;
            await _context.SaveChangesAsync();
            // Automatically sync on connection
            await SyncMicrosoftTodoAsync(userId);
        }
        else if (provider.Equals("GoogleKeep", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleKeepConnected = true;
            await _context.SaveChangesAsync();
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleKeepConnected);
    }

    public async Task<IntegrationStatusDto> DisconnectAsync(int userId, string provider)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new KeyNotFoundException("User not found");

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = false;
            
            // Delete imported MS Todo cards
            var todoCards = await _context.Cards
                .Where(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo")
                .ToListAsync();
            _context.Cards.RemoveRange(todoCards);
            
            await _context.SaveChangesAsync();
        }
        else if (provider.Equals("GoogleKeep", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleKeepConnected = false;

            // Delete imported Google Keep cards
            var keepCards = await _context.Cards
                .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleKeep")
                .ToListAsync();
            _context.Cards.RemoveRange(keepCards);

            await _context.SaveChangesAsync();
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleKeepConnected);
    }

    public async Task<List<KeepNoteDto>> GetKeepNotesAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleKeepConnected)
            throw new InvalidOperationException("Google Keep is not connected.");

        // Check which ones are already imported
        var importedIds = await _context.Cards
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleKeep")
            .Select(c => c.IntegrationExternalId)
            .ToListAsync();

        return MockKeepNotes.Select(note => new KeepNoteDto
        {
            Id = note.Id,
            Title = note.Title,
            Items = note.Items,
            IsImported = importedIds.Contains(note.Id)
        }).ToList();
    }

    public async Task<List<CardDto>> ImportKeepNotesAsync(int userId, List<string> externalIds)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleKeepConnected)
            throw new InvalidOperationException("Google Keep is not connected.");

        // Get category or create one
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Google Keep");
        if (category == null)
        {
            category = new Category { Name = "Google Keep", Color = "#f59e0b", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        // 1. Remove cards that are no longer selected
        var cardsToRemove = await _context.Cards
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleKeep" && !externalIds.Contains(c.IntegrationExternalId!))
            .ToListAsync();
        _context.Cards.RemoveRange(cardsToRemove);

        // 2. Add or update selected cards
        foreach (var externalId in externalIds)
        {
            var existingCard = await _context.Cards
                .Include(c => c.ListItems)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.IntegrationSource == "GoogleKeep" && c.IntegrationExternalId == externalId);

            var noteSource = MockKeepNotes.FirstOrDefault(n => n.Id == externalId);
            if (noteSource == null) continue;

            if (existingCard == null)
            {
                // Create new card
                var newCard = new Card
                {
                    Title = noteSource.Title,
                    Description = "Synced from Google Keep",
                    CategoryId = category.Id,
                    UserId = userId,
                    IsChecklist = true,
                    IntegrationSource = "GoogleKeep",
                    IntegrationExternalId = externalId,
                    ListItems = noteSource.Items.Select(text => new ListItem
                    {
                        Text = text,
                        IsCompleted = false,
                        IntegrationExternalId = $"{externalId}-{text.GetHashCode()}"
                    }).ToList()
                };
                _context.Cards.Add(newCard);
            }
            else
            {
                // Update title if changed
                existingCard.Title = noteSource.Title;
                // Add items that are missing
                foreach (var itemText in noteSource.Items)
                {
                    var itemExtId = $"{externalId}-{itemText.GetHashCode()}";
                    if (!existingCard.ListItems.Any(li => li.IntegrationExternalId == itemExtId))
                    {
                        existingCard.ListItems.Add(new ListItem
                        {
                            Text = itemText,
                            IsCompleted = false,
                            IntegrationExternalId = itemExtId
                        });
                    }
                }
            }
        }

        await _context.SaveChangesAsync();

        // Return all updated Google Keep cards
        var keepCards = await _context.Cards
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleKeep")
            .ToListAsync();

        return keepCards.Select(ToDto).ToList();
    }

    public async Task<CardDto> SyncMicrosoftTodoAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.MicrosoftTodoConnected)
            throw new InvalidOperationException("Microsoft TODO is not connected.");

        // Get category or create one
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Microsoft TODO");
        if (category == null)
        {
            category = new Category { Name = "Microsoft TODO", Color = "#2563eb", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        // Get or create the card
        var card = await _context.Cards
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstOrDefaultAsync(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo" && c.IntegrationExternalId == "ms-todo-default");

        if (card == null)
        {
            card = new Card
            {
                Title = "Microsoft TODO Tasks",
                Description = "Tasks synced from Microsoft TODO",
                CategoryId = category.Id,
                UserId = userId,
                IsChecklist = true,
                IntegrationSource = "MicrosoftTodo",
                IntegrationExternalId = "ms-todo-default",
                ListItems = MockTodoTasks.Select(task => new ListItem
                {
                    Text = task.Text,
                    IsCompleted = false,
                    IntegrationExternalId = task.Id
                }).ToList()
            };
            _context.Cards.Add(card);
        }
        else
        {
            // Sync items (add missing ones, keep existing ones)
            foreach (var task in MockTodoTasks)
            {
                if (!card.ListItems.Any(li => li.IntegrationExternalId == task.Id))
                {
                    card.ListItems.Add(new ListItem
                    {
                        Text = task.Text,
                        IsCompleted = false,
                        IntegrationExternalId = task.Id
                    });
                }
            }
        }

        await _context.SaveChangesAsync();

        // Reload to get fully mapped data
        var reloadedCard = await _context.Cards
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstAsync(c => c.Id == card.Id);

        return ToDto(reloadedCard);
    }

    private static CardDto ToDto(Card c) => new()
    {
        Id = c.Id,
        Order = c.Order,
        Title = c.Title,
        Description = c.Description,
        ScheduledDate = c.ScheduledDate,
        IsChecklist = c.IsChecklist,
        ListItems = c.ListItems.Select(ToItemDto).ToList(),
        CategoryId = c.CategoryId,
        UserId = c.UserId,
        IntegrationSource = c.IntegrationSource,
        IntegrationExternalId = c.IntegrationExternalId,
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
        ScheduledInstances = i.ScheduledInstances?.Select(inst => new ScheduledInstanceDto
        {
            Id = inst.Id,
            Date = inst.Date,
            IsCompleted = inst.IsCompleted,
            ListItemId = inst.ListItemId
        }).ToList() ?? new()
    };
}

using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(LifePlannerDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByGoogleAuthIdAsync(string googleAuthId)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.GoogleAuthId == googleAuthId);
    }
}

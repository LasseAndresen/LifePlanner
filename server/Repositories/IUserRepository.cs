using LifePlanner.Api.Models;

namespace LifePlanner.Api.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByGoogleAuthIdAsync(string googleAuthId);
}

using Google.Apis.Tasks.v1.Data;
using LifePlanner.Api.Models;
using GoogleTask = Google.Apis.Tasks.v1.Data.Task;

namespace LifePlanner.Api.Services;

public interface IGoogleTasksService
{
    System.Threading.Tasks.Task<IList<TaskList>> GetTaskListsAsync(User user);
    System.Threading.Tasks.Task<IList<GoogleTask>> GetTasksAsync(User user, string taskListId);
}

using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Endpoints;
using LifePlanner.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<LifePlannerDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<LifePlanner.Api.Repositories.ICardRepository, LifePlanner.Api.Repositories.CardRepository>();
builder.Services.AddScoped<LifePlanner.Api.Repositories.ICategoryRepository, LifePlanner.Api.Repositories.CategoryRepository>();
builder.Services.AddScoped<LifePlanner.Api.Repositories.IUserRepository, LifePlanner.Api.Repositories.UserRepository>();

builder.Services.AddScoped<IGoogleCalendarService, GoogleCalendarService>();

// Allow the Angular dev server to call this API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAngularDev");
app.UseHttpsRedirection();
app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapCategoryEndpoints();
app.MapCardEndpoints();
app.MapCalendarEndpoints();

app.Run();

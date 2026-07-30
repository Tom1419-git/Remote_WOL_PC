using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on all local IP addresses on port 8080
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(8080);
});

var app = builder.Build();

// Simple API Key middleware for security
app.Use(async (context, next) =>
{
    var config = app.Services.GetRequiredService<IConfiguration>();
    var expectedApiKey = config["ApiKey"] ?? "default_secret_key_change_me";
    
    // We expect the API key in the 'Authorization' header as 'Bearer <API_KEY>' 
    // or simply 'x-api-key' for shortcuts simplicity
    var providedApiKey = context.Request.Headers["x-api-key"].FirstOrDefault();

    if (string.IsNullOrEmpty(providedApiKey) || providedApiKey != expectedApiKey)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsync("Unauthorized: Invalid or missing API Key.");
        return;
    }

    await next();
});

// Helper to run cmd commands
void RunCmdCommand(string command, string arguments)
{
    var processInfo = new ProcessStartInfo
    {
        FileName = command,
        Arguments = arguments,
        CreateNoWindow = true,
        UseShellExecute = false
    };
    Process.Start(processInfo);
}

// Routes
app.MapPost("/api/lock", () =>
{
    RunCmdCommand("rundll32.exe", "user32.dll,LockWorkStation");
    return Results.Ok(new { message = "PC Locked" });
});

app.MapPost("/api/shutdown", () =>
{
    RunCmdCommand("shutdown", "/s /t 0");
    return Results.Ok(new { message = "PC Shutting down" });
});

app.MapPost("/api/sleep", () =>
{
    RunCmdCommand("rundll32.exe", "powrprof.dll,SetSuspendState 0,1,0");
    return Results.Ok(new { message = "PC Sleeping" });
});

app.MapGet("/api/status", () =>
{
    return Results.Ok(new { status = "online", os = "Windows" });
});

app.Run();

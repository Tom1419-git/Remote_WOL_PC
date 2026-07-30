using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(8085);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

app.Use(async (context, next) =>
{
    var config = app.Services.GetRequiredService<IConfiguration>();
    var expectedApiKey = config["ApiKey"] ?? "default_secret_key_change_me";
    
    var providedApiKey = context.Request.Headers["x-api-key"].FirstOrDefault();

    if (string.IsNullOrEmpty(providedApiKey) || providedApiKey != expectedApiKey)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsync("Unauthorized: Invalid or missing API Key.");
        return;
    }

    await next();
});

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

app.MapPost("/api/lock", () =>
{
    // The service runs as SYSTEM, so LockWorkStation won't affect the user's session.
    // Instead, we use tsdiscon to disconnect all user sessions (1 to 10), which effectively locks the PC.
    RunCmdCommand("cmd.exe", "/c \"for /l %i in (1,1,10) do @tsdiscon %i >nul 2>&1\"");
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

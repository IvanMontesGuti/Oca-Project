namespace BackendOcago.Services;

public class Middleware : IMiddleware
{
    public Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            context.Request.Method = "GET";
        }

        return next(context);
    }
}
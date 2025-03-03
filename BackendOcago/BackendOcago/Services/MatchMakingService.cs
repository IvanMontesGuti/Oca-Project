using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using Microsoft.EntityFrameworkCore;

public class MatchMakingService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private DataContext _dataContext;
    public const long BotUserId = 777; 

    public MatchMakingService(IServiceScopeFactory serviceScopeFactory, DataContext dataContext)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _dataContext = dataContext;
    }

    public async Task<MatchRequest> CreateRandomMatchAsync(int hostId)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        using var _context = scope.ServiceProvider.GetRequiredService<DataContext>();

        var availableMatch = await _context.MatchRequests
            .FirstOrDefaultAsync(m => m.GuestId == null
                                      && !m.IsBotGame
                                      && m.Status == "Pending"
                                      && m.HostId != hostId);

        if (availableMatch != null)
        {
            availableMatch.GuestId = hostId;
            availableMatch.Status = "Matched";
            availableMatch.GameId = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            Console.WriteLine($"[CreateRandomMatchAsync] Emparejado: host={availableMatch.HostId}, guest={availableMatch.GuestId}, gameId={availableMatch.GameId}");
            return availableMatch;
        }

        var newMatch = new MatchRequest
        {
            HostId = hostId,
            GuestId = null,
            Status = "Pending",
            IsBotGame = false,
            GameId = null
        };
        _context.MatchRequests.Add(newMatch);
        await _context.SaveChangesAsync();

        Console.WriteLine($"[CreateRandomMatchAsync] Nueva solicitud creada: host={hostId}, status=Pending");
        return newMatch;
    }


    public async Task<MatchRequest> SendInvitationAsync(int hostId, int receiverId)
    {
        using IServiceScope scope = _serviceScopeFactory.CreateScope();
        using DataContext _context = scope.ServiceProvider.GetRequiredService<DataContext>();

        var existing = await _context.MatchRequests
            .FirstOrDefaultAsync(m => m.HostId == hostId &&
                                      m.GuestId == null &&
                                      !m.IsBotGame &&
                                      m.Status == "InvitationPending");
        if (existing != null)
        {
            return existing;
        }

        var invitation = new MatchRequest
        {
            HostId = hostId,
            IsBotGame = false,
            Status = "InvitationPending",
            GameId = null
        };
        _context.MatchRequests.Add(invitation);
        await _context.SaveChangesAsync();
        return invitation;
    }
    public async Task<MatchRequest> RespondInvitationAsync(string matchRequestId, int receiverId, bool accepted)
    {
        using IServiceScope scope = _serviceScopeFactory.CreateScope();
        using DataContext _context = scope.ServiceProvider.GetRequiredService<DataContext>();

        var invitation = await _context.MatchRequests.FirstOrDefaultAsync(m => m.MatchRequestId == matchRequestId);
        if (invitation == null || invitation.Status != "InvitationPending")
        {
            return null;
        }

        if (accepted)
        {
            invitation.GuestId = receiverId;
            invitation.Status = "Matched";
            invitation.GameId = Guid.NewGuid().ToString();
        }
        else
        {
            invitation.Status = "InvitationRejected";
        }

        await _context.SaveChangesAsync();
        return invitation;
    }

    public async Task<bool> CancelMatchAsync(int hostId)
    {
        using IServiceScope scope = _serviceScopeFactory.CreateScope();
        using DataContext _context = scope.ServiceProvider.GetRequiredService<DataContext>();

        var match = await _context.MatchRequests
            .FirstOrDefaultAsync(m => m.HostId == hostId &&
                                      (m.Status == "Pending" || m.Status == "InvitationPending"));
        if (match != null)
        {
            match.Status = "Cancelled";
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<MatchRequest> ConfirmReadyAsync(string matchRequestId, int userId)
    {
        using IServiceScope scope = _serviceScopeFactory.CreateScope();
        using DataContext _context = scope.ServiceProvider.GetRequiredService<DataContext>();

        var match = await _context.MatchRequests.FirstOrDefaultAsync(m => m.MatchRequestId == matchRequestId);
        if (match == null)
            return null;

        if (match.HostId == userId)
        {
            match.HostReady = true;
        }
        else if (match.GuestId.HasValue && match.GuestId.Value == userId)
        {
            match.GuestReady = true;
        }
        await _context.SaveChangesAsync();
        return match;
    }
}

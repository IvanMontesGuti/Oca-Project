using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Services;

public class FriendshipService
{
    private readonly DbContext _dbContext;

    public FriendshipService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // Enviar una solicitud de amistad
    public async Task<bool> SendFriendRequestAsync(long senderId, long receiverId)
    {
        // Verificar que no exista ya una solicitud pendiente o aceptada
        var existingRequest = await _dbContext.Set<Friendship>()
            .FirstOrDefaultAsync(f =>
                (f.SenderId == senderId && f.ReceiverId == receiverId) ||
                (f.SenderId == receiverId && f.ReceiverId == senderId));

        if (existingRequest != null)
        {
            if (existingRequest.Status == FriendshipInvitationStatus.Pendiente)
                return false; // Ya hay una solicitud pendiente

            if (existingRequest.Status == FriendshipInvitationStatus.Aceptada)
                return false; // Ya son amigos
        }

        var newFriendship = new Friendship
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            SentAt = DateTime.UtcNow
        };

        _dbContext.Set<Friendship>().Add(newFriendship);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    // Obtener solicitudes enviadas por un usuario
    public async Task<List<Friendship>> GetSentRequestsAsync(long userId)
    {
        return await _dbContext.Set<Friendship>()
            .Where(f => f.SenderId == userId)
            .ToListAsync();
    }

    // Obtener solicitudes recibidas por un usuario
    public async Task<List<Friendship>> GetReceivedRequestsAsync(long userId)
    {
        return await _dbContext.Set<Friendship>()
            .Where(f => f.ReceiverId == userId && f.Status == FriendshipInvitationStatus.Pendiente)
            .ToListAsync();
    }

    // Aceptar una solicitud de amistad
    public async Task<bool> AcceptFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _dbContext.Set<Friendship>()
            .FirstOrDefaultAsync(f => f.Id == friendshipId && f.ReceiverId == userId);

        if (friendship == null || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        friendship.Status = FriendshipInvitationStatus.Aceptada;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    // Rechazar una solicitud de amistad
    public async Task<bool> RejectFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _dbContext.Set<Friendship>()
            .FirstOrDefaultAsync(f => f.Id == friendshipId && f.ReceiverId == userId);

        if (friendship == null || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        _dbContext.Set<Friendship>().Remove(friendship);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    // Obtener lista de amigos
    public async Task<List<User>> GetFriendsAsync(long userId)
    {
        var friendships = await _dbContext.Set<Friendship>()
            .Where(f =>
                (f.SenderId == userId || f.ReceiverId == userId) &&
                f.Status == FriendshipInvitationStatus.Aceptada)
            .ToListAsync();

        var friendIds = friendships
            .Select(f => f.SenderId == userId ? f.ReceiverId : f.SenderId)
            .ToList();

        return await _dbContext.Set<User>()
            .Where(u => friendIds.Contains(u.Id))
            .ToListAsync();
    }
}

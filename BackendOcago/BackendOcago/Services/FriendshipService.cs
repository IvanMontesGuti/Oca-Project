using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Services;

public class FriendshipService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly FriendshipMapper _mapper;

    public FriendshipService(UnitOfWork unitOfWork, FriendshipMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    /* ----- INSERT ----- */

    public async Task<bool> SendFriendRequestAsync(long senderId, long receiverId)
    {
        // Verificar si ya existe una solicitud o son amigos
        var existingFriendship = await _unitOfWork.FriendshipRepository.GetFriendshipAsync(senderId, receiverId);

        if (existingFriendship != null)
        {
            if (existingFriendship.Status == FriendshipInvitationStatus.Pendiente)
                return false; // Ya hay una solicitud pendiente

            if (existingFriendship.Status == FriendshipInvitationStatus.Aceptada)
                return false; // Ya son amigos
        }

        // Crear una nueva solicitud de amistad
        var newFriendship = new Friendship
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            SentAt = DateTime.UtcNow,
            Status = FriendshipInvitationStatus.Pendiente
        };

        await _unitOfWork.FriendshipRepository.InsertAsync(newFriendship);
        return await _unitOfWork.SaveAsync();
    }

    /* ----- GET ----- */

    public async Task<IEnumerable<FriendshipDto>> GetSentRequestsAsync(long userId)
    {
        var sentRequests = await _unitOfWork.FriendshipRepository.GetSentRequestsAsync(userId);
        return _mapper.ToDto(sentRequests);
    }

    public async Task<IEnumerable<FriendshipDto>> GetReceivedRequestsAsync(long userId)
    {
        var receivedRequests = await _unitOfWork.FriendshipRepository.GetReceivedRequestsAsync(userId);
        return _mapper.ToDto(receivedRequests);
    }

    //public async Task<IEnumerable<UserDto>> GetFriendsAsync(long userId)
    //{
    //    var friendships = await _unitOfWork.FriendshipRepository.GetAcceptedFriendshipsAsync(userId);
    //    var friends = friendships.Select(f => f.SenderId == userId ? f.Receiver : f.Sender);
    //    return friends.Select(friend => _mapper.ToDto(friend)).ToList();
    //}

    /* ----- UPDATE ----- */

    public async Task<bool> AcceptFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        friendship.Status = FriendshipInvitationStatus.Aceptada;

        _unitOfWork.FriendshipRepository.Update(friendship);
        return await _unitOfWork.SaveAsync();
    }

    public async Task<bool> RejectFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        _unitOfWork.FriendshipRepository.Delete(friendship);
        return await _unitOfWork.SaveAsync();
    }

    /* ----- DELETE ----- */

    public async Task<bool> DeleteFriendshipAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || (friendship.SenderId != userId && friendship.ReceiverId != userId))
            return false;

        _unitOfWork.FriendshipRepository.Delete(friendship);
        return await _unitOfWork.SaveAsync();
    }
}

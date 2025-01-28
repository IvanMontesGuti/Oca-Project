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
    private readonly SmartSearchService _smartSearchService;

    public FriendshipService(UnitOfWork unitOfWork, FriendshipMapper mapper, SmartSearchService smartSearchService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _smartSearchService = smartSearchService;
    }

    /* ----- SEARCH ----- */
    //public async Task<IEnumerable<User>> SearchFriendsAsync(string query)
    //{
    //    if (string.IsNullOrWhiteSpace(query))
    //    {
    //        Console.WriteLine("La consulta de búsqueda está vacía.");
    //        return Enumerable.Empty<User>();
    //    }
    //    var users = _unitOfWork.UserRepository.GetQueryable(); 
    //    var filteredUsers = await _smartSearchService.SearchUsersAsync(users, query);
    //    Console.WriteLine($"Usuarios encontrados: {filteredUsers.Count()}");
    //    return await Task.FromResult(filteredUsers);
    //}

    /* ----- INSERT ----- */
    public async Task<bool> SendFriendRequestAsync(long senderId, long receiverId)
    {
        if (await _unitOfWork.FriendshipRepository.GetFriendshipAsync(senderId, receiverId) != null)
        {
            Console.WriteLine("Ya existe una solicitud o amistad.");
            return false;
        }

        var newFriendship = new Friendship
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            SentAt = DateTime.UtcNow,
            Status = FriendshipInvitationStatus.Pendiente
        };

        await _unitOfWork.FriendshipRepository.InsertAsync(newFriendship);
        return await SaveChangesAsync("Solicitud de amistad enviada.");
    }

    /* ----- GET ----- */
    public async Task<IEnumerable<Friendship>> GetAllRequestsAsync() =>
        await _unitOfWork.FriendshipRepository.GetAllRequestsAsync();

    public async Task<IEnumerable<FriendshipDto>> GetSentRequestsAsync(long userId)
    {
        var sentRequests = await _unitOfWork.FriendshipRepository.GetSentRequestsAsync(userId);
        return _mapper.ToDto(sentRequests);
    }

    public async Task<IEnumerable<Friendship>> GetReceivedRequestsAsync(long userId) =>
        await _unitOfWork.FriendshipRepository.GetReceivedRequestsAsync(userId);

    public async Task<IEnumerable<Friendship>> GetAllFriendshipRequestsAsync() =>
        await GetAllRequestsAsync();

    public async Task<IEnumerable<FriendshipDto>> GetAllFriendshipsAsync(long UserId)
    {
        var friends = await _unitOfWork.FriendshipRepository.GetAcceptedFriendshipsAsync(UserId);
        return _mapper.ToDto(friends);
    }

        

    /* ----- UPDATE ----- */
    public async Task<bool> AcceptFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        friendship.Status = FriendshipInvitationStatus.Aceptada;

        if (!await AddFriendsToEachOtherAsync(friendship.SenderId, friendship.ReceiverId))
            return false;

        _unitOfWork.FriendshipRepository.Update(friendship);
        
        return await SaveChangesAsync("Solicitud de amistad aceptada.");
    }

    public async Task<bool> RejectFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        friendship.Status = FriendshipInvitationStatus.Rechazada;
        _unitOfWork.FriendshipRepository.Update(friendship);
        return await SaveChangesAsync("Solicitud de amistad rechazada.");
    }

    /* ----- DELETE ----- */
    public async Task<bool> RemoveFriendAsync(long userId, long friendId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetFriendshipAsync(userId, friendId);

        if (friendship == null || friendship.Status != FriendshipInvitationStatus.Aceptada)
            return false;

        if (!await RemoveFriendsFromEachOtherAsync(userId, friendId))
            return false;

        _unitOfWork.FriendshipRepository.Delete(friendship);
        return await SaveChangesAsync("Amistad eliminada.");
    }

    /* ----- PRIVATE HELPERS ----- */
    private async Task<bool> SaveChangesAsync(string successMessage)
    {
        var saved = await _unitOfWork.SaveAsync();
        Console.WriteLine(saved ? successMessage : "Error al guardar los cambios.");
        return saved;
    }

    private async Task<bool> AddFriendsToEachOtherAsync(long userId, long friendId)
    {
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        var friend = await _unitOfWork.UserRepository.GetByIdAsync(friendId);

        if (user == null || friend == null)
            return false;


        user.Friends.Add(friend);
        friend.Friends.Add(user);

        _unitOfWork.UserRepository.Update(user);
        _unitOfWork.UserRepository.Update(friend);
        return true;
    }

    private async Task<bool> RemoveFriendsFromEachOtherAsync(long userId, long friendId)
    {
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        var friend = await _unitOfWork.UserRepository.GetByIdAsync(friendId);

        if (user == null || friend == null)
            return false;

        user.Friends.Remove(friend);
        friend.Friends.Remove(user);

        _unitOfWork.UserRepository.Update(user);
        _unitOfWork.UserRepository.Update(friend);
        return true;
    }
}

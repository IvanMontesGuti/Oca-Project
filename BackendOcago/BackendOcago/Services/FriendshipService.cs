using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using BackendOcago.Models.Database.Enum;
using Microsoft.AspNetCore.Http.HttpResults;

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
       var existingFriendship = await _unitOfWork.FriendshipRepository.GetFriendshipAsync(senderId, receiverId);

       if (existingFriendship != null)
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
        var saved = await _unitOfWork.SaveAsync();
        Console.WriteLine(saved ? "Amistad creada con éxito." : "Error al guardar la amistad.");
        return saved;
    }



    /* ----- GET ----- */
    public async Task<IEnumerable<Friendship>> GetAllRequestsAsync()
    {
        var sentRequests = await _unitOfWork.FriendshipRepository.GetAllRequestsAsync();
        return sentRequests;
    }

    public async Task<IEnumerable<FriendshipDto>> GetSentRequestsAsync(long userId)
    {
        var sentRequests = await _unitOfWork.FriendshipRepository.GetSentRequestsAsync(userId);
        return _mapper.ToDto(sentRequests);
    }

    public async Task<IEnumerable<Friendship>> GetReceivedRequestsAsync(long userId)
    {
        var receivedRequests = await _unitOfWork.FriendshipRepository.GetReceivedRequestsAsync(userId);
        
        return receivedRequests.ToList();
    }

    //public async Task<IEnumerable<UserDto>> GetFriendsAsync(long userId)
    //{
    //    var friendships = await _unitOfWork.FriendshipRepository.GetAcceptedFriendshipsAsync(userId);
    //    var friends = friendships.Select(f => f.SenderId == userId ? f.Receiver : f.Sender);
    //    return friends.Select(friend => _mapper.ToDto(friend)).ToList();
    //}
    public async Task<IEnumerable<Friendship>> GetAllFriendshipRequestsAsync()
    {
        var allRequests = await GetAllRequestsAsync();
        

        return allRequests;
    }

    /* ----- UPDATE ----- */

    public async Task<bool> AcceptFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        // Actualiza el estado a aceptado
        friendship.Status = FriendshipInvitationStatus.Aceptada;

        // Obtén los usuarios y añádelos como amigos mutuamente
        var sender = await _unitOfWork.UserRepository.GetByIdAsync(friendship.SenderId);
        var receiver = await _unitOfWork.UserRepository.GetByIdAsync(friendship.ReceiverId);

        if (sender == null || receiver == null)
            return false;

        sender.Friends.Add(receiver);
        receiver.Friends.Add(sender);

        // Guarda los cambios
        _unitOfWork.FriendshipRepository.Update(friendship);
        _unitOfWork.UserRepository.Update(sender);
        _unitOfWork.UserRepository.Update(receiver);

        return await _unitOfWork.SaveAsync();
    }

    public async Task<bool> RejectFriendRequestAsync(long friendshipId, long userId)
    {
        var friendship = await _unitOfWork.FriendshipRepository.GetByIdAsync(friendshipId);

        if (friendship == null || friendship.ReceiverId != userId || friendship.Status != FriendshipInvitationStatus.Pendiente)
            return false;

        // Cambia el estado a Rechazada
        friendship.Status = FriendshipInvitationStatus.Rechazada;

        _unitOfWork.FriendshipRepository.Update(friendship);
        return await _unitOfWork.SaveAsync();
    }


    /* ----- DELETE ----- */

    public async Task<bool> RemoveFriendAsync(long userId, long friendId)
    {
        // Busca la relación de amistad entre ambos usuarios
        var friendship = await _unitOfWork.FriendshipRepository.GetFriendshipAsync(userId, friendId);

        if (friendship == null || friendship.Status != FriendshipInvitationStatus.Aceptada)
            return false;

        // Obtén los usuarios de la amistad
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        var friend = await _unitOfWork.UserRepository.GetByIdAsync(friendId);

        if (user == null || friend == null)
            return false;

        // Elimina la amistad de las listas de ambos usuarios
        user.Friends.Remove(friend);
        friend.Friends.Remove(user);

        // Elimina la relación de amistad
        _unitOfWork.FriendshipRepository.Delete(friendship);

        // Guarda los cambios
        _unitOfWork.UserRepository.Update(user);
        _unitOfWork.UserRepository.Update(friend);
        return await _unitOfWork.SaveAsync();
    }

}

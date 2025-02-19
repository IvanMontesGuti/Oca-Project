using BackendOcago.Models.Database.Enum;
using System.Collections.Concurrent;
using BackendOcago.Services;

public class LobbyService
{
    private readonly ConcurrentDictionary<string, UserStatus> _userStatuses = new();
    private readonly ConcurrentDictionary<string, string> _userLobbies = new();
    private Dictionary<string, List<string>> _lobbies = new Dictionary<string, List<string>>();
    private Queue<string> _randomQueue = new();
    private readonly UserService _userService; 

    public LobbyService(UserService userService)
    {
        _userService = userService;
    }
    public async Task<(bool paired, string opponent, string lobbyId)?> TryPairUsersAsync()
    {
        var searchingUsers = _userStatuses.Where(u => u.Value == UserStatus.BuscandoPartida).Select(u => u.Key).ToList();

        if (searchingUsers.Count >= 2)
        {
            string player1 = searchingUsers[0];
            string player2 = searchingUsers[1];

            _userStatuses[player1] = UserStatus.Jugando;
            _userStatuses[player2] = UserStatus.Jugando;

            string lobbyId = Guid.NewGuid().ToString();
            _lobbies[lobbyId] = new List<string> { player1, player2 };

            return (true, player2, lobbyId);
        }
        return (false, null, null);
    }

    public async Task SetUserStatusAsync(string userId, UserStatus status)
    {
        _userStatuses.AddOrUpdate(userId, status, (key, oldValue) => status);

        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(status, id);
        }
        else
        {

            throw new ArgumentException("El userId no es un número válido.", nameof(userId));
        }
    }


    public UserStatus GetUserStatus(string userId)
    {
        return _userStatuses.TryGetValue(userId, out var status) ? status : UserStatus.Desconectado;
    }

    public IEnumerable<string> GetUsersByStatus(UserStatus status)
    {
        return _userStatuses.Where(kvp => kvp.Value == status).Select(kvp => kvp.Key);
    }

    public async Task RemoveUser(string userId)
    {
        _userStatuses.TryRemove(userId, out _);
        RemoveFromRandomQueue(userId);

        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(UserStatus.Desconectado, id);
        }
    }

    public Task<(bool paired, string opponent, string lobbyId)?> AddToRandomQueueAsync(string userId)
    {
        lock (_randomQueue)
        {
            if (!_randomQueue.Contains(userId))
            {
                _randomQueue.Enqueue(userId);
            }

            if (_randomQueue.Count >= 2)
            {
                string player1 = _randomQueue.Dequeue();
                string player2 = _randomQueue.Dequeue();

                _userStatuses[player1] = UserStatus.BuscandoPartida;
                _userStatuses[player2] = UserStatus.BuscandoPartida;

                string lobbyId = Guid.NewGuid().ToString();
                _lobbies[lobbyId] = new List<string> { player1, player2 };

                return Task.FromResult<(bool paired, string opponent, string lobbyId)?>((true, player2, lobbyId));
            }
        }
        return Task.FromResult<(bool paired, string opponent, string lobbyId)?>((false, null, null));
    }



    public void RemoveFromRandomQueue(string userId)
    {
        lock (_randomQueue)
        {
            var newQueue = new Queue<string>(_randomQueue.Where(u => u != userId));
            while (_randomQueue.Count > 0)
            {
                _randomQueue.Dequeue();
            }
            foreach (var u in newQueue)
            {
                _randomQueue.Enqueue(u);
            }
        }
    }


    public async Task StartBotGameAsync(string userId)
    {
        _userStatuses[userId] = UserStatus.Jugando;
        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(UserStatus.Jugando, id);
        }
    }

    public string ReassignHost(string hostId, IEnumerable<string> currentPlayers)
    {
        var newHost = currentPlayers.FirstOrDefault(id => id != hostId);
        return newHost;
    }

    public bool IsUserInLobby(string userId)
    {
        return _userLobbies.ContainsKey(userId);
    }

    public async Task<string> CreateLobbyAsync(string userId)
    {
        string lobbyId = Guid.NewGuid().ToString();
        _lobbies[lobbyId] = new List<string> { userId };
        _userLobbies[userId] = lobbyId;

        Console.WriteLine($"Lobby creado: {lobbyId} por usuario {userId}");
        Console.WriteLine($"Lobbies actuales después de crear: {string.Join(", ", _lobbies.Keys)}"); 

        return lobbyId;
    }



    public async Task<bool> AddUserToLobbyAsync(string userId, string lobbyId)
    {
        Console.WriteLine($"Intentando unir usuario {userId} al lobby {lobbyId}");
        Console.WriteLine($"Lobbies actuales: {string.Join(", ", _lobbies.Keys)}"); 

        if (!_lobbies.ContainsKey(lobbyId))
        {
            Console.WriteLine($"Error: Lobby {lobbyId} no encontrado en _lobbies.");
            return false;
        }

        var lobby = _lobbies[lobbyId];

        if (lobby.Contains(userId))
        {
            Console.WriteLine($"Usuario {userId} ya estaba en el lobby {lobbyId}");
            return true; 
        }

        lobby.Add(userId);
        _userLobbies[userId] = lobbyId;
        Console.WriteLine($"Usuario {userId} añadido al lobby {lobbyId}");
        return true;
    }



    public void SetUserSearching(string userId)
    {
        _userStatuses[userId] = UserStatus.BuscandoPartida;
    }
    public string? GetUserLobbyId(string userId)
    {
        return _userLobbies.TryGetValue(userId, out var lobbyId) ? lobbyId : null;
    }

}

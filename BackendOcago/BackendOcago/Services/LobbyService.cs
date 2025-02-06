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
        // Convertir el userId a long, asumiendo que el string se puede parsear a long.
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

        // Asegurar que el usuario se marca como desconectado en la base de datos
        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(UserStatus.Desconectado, id);
        }
    }


    public async Task<(bool paired, string opponent, string lobbyId)?> AddToRandomQueueAsync(string userId)
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

                _userStatuses[player1] = UserStatus.Jugando;
                _userStatuses[player2] = UserStatus.Jugando;

                string lobbyId = Guid.NewGuid().ToString();
                _lobbies[lobbyId] = new List<string> { player1, player2 };

                return (true, player2, lobbyId);
            }
        }
        return (false, null, null);
    }



    public void RemoveFromRandomQueue(string userId)
    {
        lock (_randomQueue)
        {
            // Reconstruir la cola sin el usuario
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

    // Método para verificar si un usuario está en un lobby
    public bool IsUserInLobby(string userId)
    {
        return _userLobbies.ContainsKey(userId);
    }

    public async Task<string> CreateLobbyAsync(string userId)
    {
        string lobbyId = Guid.NewGuid().ToString();
        _lobbies[lobbyId] = new List<string> { userId };
        return lobbyId;
    }


    public async Task AddUserToLobbyAsync(string userId, string lobbyId)
    {
        if (_lobbies.ContainsKey(lobbyId))
        {
            _lobbies[lobbyId].Add(userId);
        }
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

using BackendOcago.Models.Database.Enum;
using System.Collections.Concurrent;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using BackendOcago.Services;

public class LobbyService
{
    private readonly ConcurrentDictionary<string, UserStatus> _userStatuses;
    private readonly Queue<string> _randomQueue = new();
    private readonly UserService _userService;

    public LobbyService(UserService userService)
    {
        _userService = userService;
        _userStatuses = new ConcurrentDictionary<string, UserStatus>(); // 🔹 Se inicializa aquí
    }


    /// <summary>
    /// Agrega o actualiza el estado de un usuario en memoria y en la base de datos.
    /// </summary>
    public async Task SetUserStatusAsync(string userId, UserStatus status)
    {
        try
        {
            // Normalizar userId (ejemplo: eliminar espacios)
            userId = userId.Trim();

            _userStatuses.AddOrUpdate(userId, status, (key, oldValue) => status);
            Console.WriteLine($"[SET STATUS] Usuario: '{userId}', Estado: {status}");

            // Log para ver el estado actual de los usuarios en memoria
            Console.WriteLine($"[SET STATUS] {status} para usuario {userId}");
            Console.WriteLine($"[SET STATUS] Todos los usuarios almacenados: {string.Join(", ", _userStatuses.Select(kv => kv.Key + "=" + kv.Value))}");

            if (long.TryParse(userId, out long id))
            {
                // Actualiza el estado en la base de datos
                await _userService.UpdateStatus(status, id);
                Console.WriteLine($"[DB STATUS] Estado de {userId} actualizado en la DB a {status}");
            }
            else
            {
                throw new ArgumentException("El userId no es un número válido.", nameof(userId));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] No se pudo actualizar el estado de {userId}: {ex.Message}");
            throw;
        }
    }




    /// <summary>
    /// Obtiene el estado actual de un usuario.
    /// Si el usuario no está registrado, se asume que está Desconectado.
    /// </summary>
    public UserStatus GetUserStatus(string userId)
    {
        userId = userId.Trim(); // 🔹 Normalizar al buscar
        Console.WriteLine($"[GET STATUS] Buscando estado de '{userId}'");
        Console.WriteLine($"[GET STATUS] Claves existentes: {string.Join(", ", _userStatuses.Keys.Select(k => $"'{k}'"))}"); // 🔹 Mostrar claves con comillas
        return _userStatuses.TryGetValue(userId, out var status) ? status : UserStatus.Desconectado;
    }





    /// <summary>
    /// Obtiene la lista de usuarios que se encuentren en un estado específico.
    /// </summary>
    public IEnumerable<string> GetUsersByStatus(UserStatus status)
    {
        return _userStatuses.Where(kvp => kvp.Value == status).Select(kvp => kvp.Key);
    }

    /// <summary>
    /// Remueve al usuario del lobby (por ejemplo, cuando se desconecta) y de la cola aleatoria.
    /// </summary>
    public async Task RemoveUser(string userId)
    {
        Console.WriteLine($"[REMOVE USER] Eliminando usuario {userId} de _userStatuses");
        _userStatuses.TryRemove(userId, out _);

        Console.WriteLine($"[REMOVE USER] Usuarios después de eliminación: {string.Join(", ", _userStatuses.Select(kv => kv.Key + "=" + kv.Value))}");

        RemoveFromRandomQueue(userId);

        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(UserStatus.Desconectado, id);
        }
    }



    /// <summary>
    /// Agrega un usuario a la cola de emparejamiento aleatorio.
    /// Si hay al menos dos usuarios en cola, se emparejan y se actualiza su estado a Jugando.
    /// </summary>
    public async Task<(bool paired, string opponent)?> AddToRandomQueueAsync(string userId)
    {
        lock (_randomQueue)
        {
            if (!_randomQueue.Contains(userId))
            {
                _randomQueue.Enqueue(userId);
            }

            if (_randomQueue.Count >= 2)
            {
                // Sacamos dos jugadores de la cola
                string player1 = _randomQueue.Dequeue();
                string player2 = _randomQueue.Dequeue();

                // Actualizamos su estado a Jugando en memoria
                _userStatuses[player1] = UserStatus.Jugando;
                _userStatuses[player2] = UserStatus.Jugando;

                // Retornamos el oponente del usuario que llamó (si aplica)
                if (player1 == userId)
                {
                    return (true, player2);
                }
                else if (player2 == userId)
                {
                    return (true, player1);
                }
                else
                {
                    // El usuario que llamó ya estaba en cola, pero no es parte de la pareja actual.
                    return null;
                }
            }
        }
        return (false, null);
    }

    /// <summary>
    /// Remueve un usuario de la cola de emparejamiento aleatorio.
    /// </summary>
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

    /// <summary>
    /// Marca al usuario como Jugando contra un bot y actualiza su estado en la base de datos.
    /// </summary>
    public async Task StartBotGameAsync(string userId)
    {
        _userStatuses[userId] = UserStatus.Jugando;
        if (long.TryParse(userId, out long id))
        {
            await _userService.UpdateStatus(UserStatus.Jugando, id);
        }
    }

    /// <summary>
    /// (Opcional) Lógica para reasignar anfitrión si el actual se desconecta.
    /// </summary>
    public string ReassignHost(string hostId, IEnumerable<string> currentPlayers)
    {
        var newHost = currentPlayers.FirstOrDefault(id => id != hostId);
        return newHost;
    }
}

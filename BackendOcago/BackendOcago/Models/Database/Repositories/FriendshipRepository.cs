using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Enum;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database.Repositories
{
    public class FriendshipRepository : Repository<Friendship>
    {
        private readonly DataContext _dbContext;

        public FriendshipRepository(DataContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Friendship?> GetFriendshipAsync(long senderId, long receiverId)
        {
            return await _dbContext.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.SenderId == senderId && f.ReceiverId == receiverId) ||
                    (f.SenderId == receiverId && f.ReceiverId == senderId));
        }

        public async Task<IEnumerable<Friendship>> GetSentRequestsAsync(long userId)
        {
            return await _dbContext.Friendships
                .Where(f => f.SenderId == userId && f.Status == FriendshipInvitationStatus.Pendiente)
                .Include(f => f.Receiver)
                .ToListAsync();
        }

        public async Task<IEnumerable<Friendship>> GetReceivedRequestsAsync(long userId)
        {
            return await _dbContext.Friendships
                .Where(f => f.ReceiverId == userId)
                .Include(f => f.Sender) // Include only if you need Sender data
                .ToListAsync();
        }

        

        public async Task<IEnumerable<Friendship>> GetAcceptedFriendshipsAsync(long userId)
        {
            return await _dbContext.Friendships
                .Where(f => (f.SenderId == userId || f.ReceiverId == userId) && f.Status == FriendshipInvitationStatus.Aceptada)
                .Include(f => f.Sender)
                .Include(f => f.Receiver)
                .ToListAsync();
        }

        public async Task<IEnumerable<Friendship>> GetAllRequestsAsync()
        {
            return await _dbContext.Friendships
                .ToListAsync();
        }

    }
}

using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Dtos;

namespace BackendOcago.Models.Mappers
{
    public class FriendshipMapper
    {
        private readonly UserMapper _userMapper;

        public FriendshipMapper(UserMapper userMapper)
        {
            _userMapper = userMapper;
        }

        public FriendshipDto ToDto(Friendship friendship)
        {
            if (friendship == null)
                throw new ArgumentNullException(nameof(friendship));

            return new FriendshipDto
            {
                Id = friendship.Id,
                Sender = friendship.Sender != null ? _userMapper.ToDto(friendship.Sender) : null,
                Receiver = friendship.Receiver != null ? _userMapper.ToDto(friendship.Receiver) : null,
                SentAt = friendship.SentAt,
                Status = friendship.Status
            };
        }

        public IEnumerable<FriendshipDto> ToDto(IEnumerable<Friendship> friendships)
        {
            if (friendships == null)
                throw new ArgumentNullException(nameof(friendships));

            return friendships
                .Where(f => f != null) 
                .Select(ToDto)
                .Where(dto => dto.Sender != null && dto.Receiver != null); 
        }

    }
}

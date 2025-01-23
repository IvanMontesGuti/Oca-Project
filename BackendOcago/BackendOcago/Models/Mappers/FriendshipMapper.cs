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
                Sender = _userMapper.ToDto(friendship.Sender),
                Receiver = _userMapper.ToDto(friendship.Receiver),
                SentAt = friendship.SentAt,
                Status = friendship.Status
            };
        }

        public IEnumerable<FriendshipDto> ToDto(IEnumerable<Friendship> friendships)
        {
            if (friendships == null)
                throw new ArgumentNullException(nameof(friendships));

            return friendships.Select(ToDto);
        }

        public Friendship ToEntity(FriendshipDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            return new Friendship
            {
                Id = dto.Id,
                SenderId = dto.Sender.Id,
                ReceiverId = dto.Receiver.Id,
                SentAt = dto.SentAt,
                Status = dto.Status
            };
        }
    }
}

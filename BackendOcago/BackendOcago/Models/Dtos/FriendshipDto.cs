using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Models.Dtos;

public class FriendshipDto
{
    public long Id { get; set; }
    public UserDto Sender { get; set; }
    public UserDto Receiver { get; set; }
    public DateTime SentAt { get; set; }
    public FriendshipInvitationStatus Status { get; set; }

}



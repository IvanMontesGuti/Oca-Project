using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Models.Database.Entities
{
    public class FriendshipInvitation
    {
        public long Id { get; set; }
        public long SenderId { get; set; }
        public long ReceiverId { get; set; }
        public DateTime SentAt { get; set; }
        public FriendshipInvitationStatus Status { get; set; } = FriendshipInvitationStatus.Pendiente;
    }
}

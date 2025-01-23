using BackendOcago.Models.Database.Enum;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendOcago.Models.Database.Entities
{
    public class Friendship
    {
        public long Id { get; set; }

        [ForeignKey("Sender")]
        public long SenderId { get; set; }
        public User Sender { get; set; }

        [ForeignKey("Receiver")]
        public long ReceiverId { get; set; }
        public User Receiver { get; set; }

        public DateTime SentAt { get; set; }
        public FriendshipInvitationStatus Status { get; set; } = FriendshipInvitationStatus.Pendiente;
    }
}

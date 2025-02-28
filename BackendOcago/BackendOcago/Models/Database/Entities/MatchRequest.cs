using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendOcago.Models.Database.Entities
{
    public class MatchRequest
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] 
        public string MatchRequestId { get; set; }
        public int HostId { get; set; }
        public int? GuestId { get; set; }
        public string GameId { get; set; } 
        public bool IsBotGame { get; set; }
        public string Status { get; set; }

        public bool HostReady { get; set; }
        public bool GuestReady { get; set; }
    }

}

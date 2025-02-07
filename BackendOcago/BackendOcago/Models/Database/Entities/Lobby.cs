using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendOcago.Models.Database.Entities;

public class Lobby
{
    public long Id { get; set; }
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public List<User> Usuarios { get; set; } = new();
}

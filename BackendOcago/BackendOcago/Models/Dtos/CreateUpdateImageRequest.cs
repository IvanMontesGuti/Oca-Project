﻿namespace BackendOcago.Models.Dtos;

public class CreateUpdateImageRequest
{
    public string Name { get; set; }
    public IFormFile File { get; set; }
}

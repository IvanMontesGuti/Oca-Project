using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using BackendOcago.Services;
using Microsoft.AspNetCore.Mvc;

namespace BackendOcago.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ImagesController : ControllerBase
{
    private readonly ImageService _service;
    private readonly ImageMapper _mapper;

    public ImagesController(ImageService service, ImageMapper mapper)
    {
        _service = service;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<IEnumerable<ImageDto>> GetAllAsync()
    {
        IEnumerable<Image> images = await _service.GetAllAsync();

        return _mapper.ToDto(images, Request);
    }

    [HttpGet("{name}")]
    public async Task<ImageDto> GetAsync(string name)
    {
        Image image = await _service.GetAsync(name);

        return _mapper.ToDto(image, Request);
    }

    [HttpPost]
    public async Task<ActionResult<ImageDto>> InsertAsync(CreateUpdateImageRequest createImage)
    {
        Image newImage = await _service.InsertAsync(createImage);

        return Created($"images/{newImage.Name}", _mapper.ToDto(newImage));
    }

    [HttpPut("{name}")]
    public async Task<ActionResult<ImageDto>> UpdateAsync(string name, CreateUpdateImageRequest updateImage)
    {
        Image imageUpdated = await _service.UpdateAsync(name, updateImage);

        return Ok(_mapper.ToDto(imageUpdated));
    }

    [HttpDelete("{name}")]
    public async Task<ActionResult<ImageDto>> DeleteAsync(string name)
    {
        await _service.DeleteAsync(name);

        return NoContent();
    }
}

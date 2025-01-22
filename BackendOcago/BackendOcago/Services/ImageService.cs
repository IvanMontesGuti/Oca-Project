using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Helpers;
using BackendOcago.Models.Dtos;

namespace BackendOcago.Services;

public class ImageService
{
    private const string IMAGES_FOLDER = "images";

    private readonly UnitOfWork _unitOfWork;

    public ImageService(UnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public Task<ICollection<Image>> GetAllAsync()
    {
        return _unitOfWork.ImageRepository.GetAllAsync();
    }

    public async Task<Image> GetAsync(string name)
    {
        Image? image = await _unitOfWork.ImageRepository.GetByConditionAsync(img => img.Name == name);
        if (image == null)
        {
            throw new KeyNotFoundException($"Image with name '{name}' not found.");
        }
        return image;
    }

    public async Task<Image> InsertAsync(CreateUpdateImageRequest image)
    {
        if (image == null || image.File == null)
        {
            string fileName = image?.File?.FileName ?? "default.png";
            throw new ArgumentNullException(nameof(image), "Image or File cannot be null.");
        }

        string relativePath = $"{IMAGES_FOLDER}/{image.File.FileName}";

        Image newImage = new Image
        {
            Name = image.Name,
            Path = relativePath
        };

        await _unitOfWork.ImageRepository.InsertAsync(newImage);

        if (await _unitOfWork.SaveAsync())
        {
            await StoreImageAsync(relativePath, image.File);
        }

        return newImage;
    }


    public async Task<Image> UpdateAsync(string name, CreateUpdateImageRequest image)
    {
        Image? entity = await _unitOfWork.ImageRepository.GetByConditionAsync(img => img.Name == name);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Image with name '{name}' not found.");
        }

        entity.Name = image.Name;

        _unitOfWork.ImageRepository.Update(entity);

        if (await _unitOfWork.SaveAsync() && image.File != null)
        {
            await StoreImageAsync(entity.Path, image.File);
        }

        return entity;
    }

    public async Task DeleteAsync(string name)
    {
        Image? image = await _unitOfWork.ImageRepository.GetByConditionAsync(img => img.Name == name);
        if (image == null)
        {
            throw new KeyNotFoundException($"Image with name '{name}' not found.");
        }

        _unitOfWork.ImageRepository.Delete(image);

        await _unitOfWork.SaveAsync();
    }

    private async Task StoreImageAsync(string relativePath, IFormFile file)
    {
        // Ruta absoluta a la carpeta donde se guardará la imagen
        string rootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", IMAGES_FOLDER);

        // Crear el directorio si no existe
        if (!Directory.Exists(rootPath))
        {
            Directory.CreateDirectory(rootPath);
        }

        // Ruta completa del archivo
        string filePath = Path.Combine(rootPath, file.FileName);

        // Guardar el archivo en la ruta especificada
        using Stream stream = file.OpenReadStream();
        await FileHelper.SaveAsync(stream, filePath);
    }


}

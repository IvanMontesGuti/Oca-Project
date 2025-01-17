using BackendOcago.Models.Database.Entities;

namespace BackendOcago.Models.Database.Repositories;

public class ImageRepository : Repository<Image>
{
    public ImageRepository(DataContext context) : base(context)
    {
    }
}

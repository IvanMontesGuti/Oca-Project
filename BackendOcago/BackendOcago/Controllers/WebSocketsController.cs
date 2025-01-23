using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackendOcago.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WebSocketsController : ControllerBase
    {


    }
    /*
    LEER MENSAJE DE TEXTO
    List <byte> textRaw;
    byte[] text = [...];
    string textString = Encoding.UTF8.ToString(textRaw);

    ENVIAR MENSAJE DE TEXTO
    bytes toSend = Encoding.UTF8.ToBytes(json);
     * */
}

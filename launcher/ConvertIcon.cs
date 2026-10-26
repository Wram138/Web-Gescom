using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace IconGenerator
{
    class Program
    {
        static void Main()
        {
            string pngPath = @"c:\DEV\Web-Gescom\Icon\pdv.png";
            string icoPath = @"c:\DEV\Web-Gescom\Icon\pdv.ico";

            using (Bitmap src = new Bitmap(pngPath))
            {
                // Converte para tamanhos comuns (ex: 256x256 ou usa a original redimensionada)
                int size = 256;
                using (Bitmap bmp = new Bitmap(src, new Size(size, size)))
                {
                    using (MemoryStream ms = new MemoryStream())
                    {
                        bmp.Save(ms, ImageFormat.Png);
                        byte[] pngBytes = ms.ToArray();

                        using (FileStream fs = new FileStream(icoPath, FileMode.Create))
                        using (BinaryWriter bw = new BinaryWriter(fs))
                        {
                            // ICONDIR
                            bw.Write((short)0); // reserved
                            bw.Write((short)1); // type 1 = icon
                            bw.Write((short)1); // 1 image

                            // ICONDIRENTRY
                            bw.Write((byte)0); // width (0 = 256)
                            bw.Write((byte)0); // height (0 = 256)
                            bw.Write((byte)0); // colors
                            bw.Write((byte)0); // reserved
                            bw.Write((short)1); // color planes
                            bw.Write((short)32); // bit depth
                            bw.Write((int)pngBytes.Length); // size of image data
                            bw.Write((int)22); // offset (6 + 16 = 22)

                            // PNG data
                            bw.Write(pngBytes);
                        }
                    }
                }
            }

            Console.WriteLine("pdv.ico gerado com sucesso!");
        }
    }
}


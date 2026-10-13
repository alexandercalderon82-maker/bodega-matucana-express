"""Generate print and social documents with a real QR; pip install qrcode reportlab pillow."""
from pathlib import Path
import qrcode
import qrcode.image.svg
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'difusion'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'https://bodega-matucana-express-hx8c.vercel.app/'
LOGO = ROOT / 'public' / 'brand' / 'matumarket-emblema.png'
GREEN = '#163F31'
CREAM = '#FBF7E9'
ORANGE = '#FF7A14'
pdfmetrics.registerFont(TTFont('Matu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('MatuBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=24, border=4)
qr.add_data(URL)
qr.make(fit=True)
qr.make_image(fill_color='black', back_color='white').save(OUT / 'matumarket-qr.png')
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(OUT / 'matumarket-qr.svg')
matrix = qr.get_matrix()

def text(c, value, x, y, size=12, color=GREEN, bold=False):
    c.setFillColor(HexColor(color)); c.setFont('MatuBold' if bold else 'Matu', size); c.drawString(x,y,value)

def centered(c,value,w,y,size=12,color=GREEN,bold=False):
    c.setFillColor(HexColor(color)); c.setFont('MatuBold' if bold else 'Matu',size); c.drawCentredString(w/2,y,value)

def code(c,x,y,size):
    c.setFillColor(HexColor('#FFFFFF')); c.rect(x,y,size,size,fill=1,stroke=0)
    unit = size / len(matrix)
    c.setFillColor(HexColor('#000000'))
    for row, line in enumerate(matrix):
        for col, dark in enumerate(line):
            if dark: c.rect(x+col*unit,y+size-(row+1)*unit,unit+0.015,unit+0.015,fill=1,stroke=0)
    c.linkURL(URL,(x,y,x+size,y+size),relative=1)

def design(c,w,h,tall=False):
    c.setFillColor(HexColor(CREAM)); c.rect(0,0,w,h,fill=1,stroke=0)
    c.setFillColor(HexColor('#F1EDD9')); c.circle(w-12,h-212,70,fill=1,stroke=0)
    c.setFillColor(HexColor(ORANGE)); c.circle(w-41,h-137,18,fill=1,stroke=0)
    c.drawImage(ImageReader(str(LOGO)),35,h-113,78,78)
    text(c,'MatuMarket',125,h-74,34,bold=True)
    text(c,'Tu compra cerca de casa',128,h-96,11)
    text(c,'DE MATUCANA, PARA TI.',43,h-152,10,bold=True)
    text(c,'Tu compra,',40,h-214,45,bold=True)
    text(c,'a un escaneo.',40,h-269,45,bold=True)
    text(c,'Elige tus productos en nuestra tienda online',43,h-304,13)
    text(c,'y coordina tu pedido por WhatsApp.',43,h-324,13)
    c.setFillColor(HexColor(GREEN)); c.roundRect(40,h-419,w-80,72,14,fill=1,stroke=0)
    text(c,'DELIVERY GRATIS',59,h-375,20,'#FFFFFF',True)
    text(c,'en Matucana centro',59,h-400,13,'#FFFFFF')
    text(c,'Alrededores',w-180,h-375,12,'#FFFFFF')
    text(c,'S/ 5',w-180,h-401,22,'#FFFFFF',True)
    text(c,'Aceptamos Yape y efectivo',43,h-447,12,bold=True)
    if tall:
        centered(c,'ESCANEA Y ENTRA A LA TIENDA',w,465,12,bold=True)
        code(c,(w-260)/2,168,260)
        centered(c,'Desde tu celular: elige, pide y coordina.',w,142,11)
        centered(c,'WhatsApp: 908 953 959',w,106,15,bold=True)
        centered(c,'Jr. Tacna · Matucana',w,81,12)
        centered(c,'Atención: 7:00 a. m. – 10:00 p. m.',w,59,11)
        centered(c,'Confirmamos disponibilidad y cobertura por WhatsApp.',w,28,8)
    else:
        code(c,40,55,162)
        text(c,'Escanea y entra',224,184,18,bold=True)
        text(c,'a nuestra tienda.',224,159,18,bold=True)
        text(c,'Elige tus productos',224,130,11)
        text(c,'y pide por WhatsApp.',224,112,11)
        text(c,'WhatsApp: 908 953 959',224,78,12,bold=True)
        centered(c,'Jr. Tacna · Matucana  |  7:00 a. m. – 10:00 p. m.',w,32,9)
        centered(c,'Confirmamos disponibilidad y cobertura por WhatsApp.',w,15,8)

def document(name,w,h,tall=False):
    c=canvas.Canvas(str(OUT / name),pagesize=(w,h))
    c.setTitle('MatuMarket · Tu compra cerca de casa')
    c.setAuthor('MatuMarket')
    design(c,w,h,tall)
    c.showPage(); c.save()

document('matumarket-estado.pdf',540,960,True)
document('matumarket-publicacion.pdf',540,675)
c=canvas.Canvas(str(OUT/'matumarket-afiche-a4.pdf'),pagesize=(595.276,841.89))
c.setTitle('MatuMarket · Afiche A4 para imprimir')
c.setAuthor('MatuMarket')
scale=515.276/540
c.translate(40,(841.89-675*scale)/2);c.scale(scale,scale)
design(c,540,675)
c.showPage();c.save()
(OUT/'texto-para-compartir.txt').write_text('MatuMarket · Tu compra cerca de casa\n\nHaz tu pedido online y coordina por WhatsApp.\nDelivery gratis en Matucana centro. Alrededores: S/ 5.\nAceptamos Yape y efectivo.\n\nEntra aquí: '+URL+'\n\nConfirmamos disponibilidad y cobertura por WhatsApp.\n',encoding='utf-8')
print('QR real y documentos generados en public/difusion. No modifica imágenes originales.')

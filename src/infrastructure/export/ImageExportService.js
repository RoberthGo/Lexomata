export class ImageExportService {
  static exportCanvasAsPng(canvas, filename = 'automata.png') {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  static exportCanvasAsJpeg(canvas, filename = 'automata.jpg') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }
}

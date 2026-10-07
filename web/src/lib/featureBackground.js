import { featureFormat } from "../data/featureFormats";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть изображение"));
    image.src = src;
  });
}

/** Continue the colors at each edge of the source into the empty canvas. */
export async function extendFeatureBackground(source, formatId, position = 100) {
  const image = await loadImage(source);
  const { width, height } = featureFormat(formatId);
  // Leave enough clear space above the subject for the headline in every ratio.
  const fit = Math.min(width / image.width, height * .55 / image.height);
  const imageWidth = image.width * fit;
  const imageHeight = image.height * fit;
  const left = (width - imageWidth) / 2;
  const top = (height - imageHeight) * Math.max(0, Math.min(100, position)) / 100;

  const sample = document.createElement("canvas");
  const sampleScale = Math.min(1, 500 / Math.max(image.width, image.height));
  sample.width = Math.max(1, Math.round(image.width * sampleScale));
  sample.height = Math.max(1, Math.round(image.height * sampleScale));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  sampleContext.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
  const get = (x, y, channel) => {
    const px = Math.max(0, Math.min(sample.width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(sample.height - 1, Math.round(y)));
    return pixels[(py * sample.width + px) * 4 + channel];
  };

  const back = document.createElement("canvas");
  const backScale = Math.min(1, 500 / Math.max(width, height));
  back.width = Math.max(1, Math.round(width * backScale));
  back.height = Math.max(1, Math.round(height * backScale));
  const backContext = back.getContext("2d");
  const output = backContext.createImageData(back.width, back.height);
  const edgeDepth = Math.max(2, Math.round(sample.height * 0.025));
  const smooth = (x, y, channel) => {
    let total = 0;
    for (let delta = -12; delta <= 12; delta += 4) total += get(x + delta, y, channel);
    return total / 7;
  };

  for (let y = 0; y < back.height; y++) {
    for (let x = 0; x < back.width; x++) {
      const sourceX = (x + .5) / back.width * (sample.width - 1);
      const index = (y * back.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const edge = smooth(sourceX, 0, c);
        const slope = edge - smooth(sourceX, edgeDepth, c);
        const value = edge + slope * Math.min(1, y / back.height) * .35;
        output.data[index + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
      output.data[index + 3] = 255;
    }
  }
  backContext.putImageData(output, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(back, 0, 0, width, height);
  // Feather the plain top edge into the continued gradient to avoid a seam.
  const foreground = document.createElement("canvas");
  foreground.width = width;
  foreground.height = height;
  const foregroundContext = foreground.getContext("2d");
  foregroundContext.drawImage(image, left, top, imageWidth, imageHeight);
  foregroundContext.globalCompositeOperation = "destination-in";
  const fade = foregroundContext.createLinearGradient(0, top, 0, top + Math.min(80, imageHeight * .1));
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  foregroundContext.fillStyle = fade;
  foregroundContext.fillRect(0, top, width, imageHeight);
  const sideFade = left > 1 ? Math.min(180, imageWidth * .2) : 0;
  foregroundContext.globalCompositeOperation = "destination-out";
  for (const [x0, x1, reverse] of sideFade ? [[left, left + sideFade, false], [left + imageWidth - sideFade, left + imageWidth, true]] : []) {
    const gradient = foregroundContext.createLinearGradient(x0, 0, x1, 0);
    gradient.addColorStop(0, reverse ? "rgba(0,0,0,0)" : "rgba(0,0,0,1)");
    gradient.addColorStop(1, reverse ? "rgba(0,0,0,1)" : "rgba(0,0,0,0)");
    foregroundContext.fillStyle = gradient;
    foregroundContext.fillRect(x0, top, sideFade, imageHeight);
  }
  context.drawImage(foreground, 0, 0);
  const webp = canvas.toDataURL("image/webp", .88);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", .9);
}

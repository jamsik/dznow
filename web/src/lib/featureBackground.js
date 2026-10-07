import { featureFormat } from "../data/featureFormats";

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть изображение"));
    image.src = source;
  });
}

/** Make only the gradient backdrop. The photo itself stays a movable CSS layer. */
export async function buildFeatureBackdrop(source, formatId) {
  const image = await loadImage(source);
  const { width, height } = featureFormat(formatId);
  const sample = document.createElement("canvas");
  const sampleScale = Math.min(1, 500 / Math.max(image.width, image.height));
  sample.width = Math.max(1, Math.round(image.width * sampleScale));
  sample.height = Math.max(1, Math.round(image.height * sampleScale));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  sampleContext.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
  const get = (x, y, channel) => {
    const px = Math.max(0, Math.min(sample.width - 1, Math.round(x)));
    return pixels[(y * sample.width + px) * 4 + channel];
  };
  const average = (x, y, channel, radius, step) => {
    let total = 0, count = 0;
    for (let offset = -radius; offset <= radius; offset += step) {
      total += get(x + offset, y, channel);
      count++;
    }
    return total / count;
  };

  // A narrow top strip preserves the original horizontal color gradient.
  // A blurred bottom strip extends ground/floor color without repeating details.
  const back = document.createElement("canvas");
  const scale = Math.min(1, 500 / Math.max(width, height));
  back.width = Math.max(1, Math.round(width * scale));
  back.height = Math.max(1, Math.round(height * scale));
  const backContext = back.getContext("2d");
  const output = backContext.createImageData(back.width, back.height);
  const bottomStart = .76;
  for (let x = 0; x < back.width; x++) {
    const sx = (x + .5) / back.width * (sample.width - 1);
    const top = [0, 1, 2].map(c => average(sx, 0, c, 12, 4));
    const bottom = [0, 1, 2].map(c => average(sx, sample.height - 1, c, 60, 10));
    for (let y = 0; y < back.height; y++) {
      const fraction = y / Math.max(1, back.height - 1);
      const blend = Math.max(0, Math.min(1, (fraction - bottomStart) / (1 - bottomStart)));
      const index = (y * back.width + x) * 4;
      for (let c = 0; c < 3; c++) output.data[index + c] = Math.round(top[c] * (1 - blend) + bottom[c] * blend);
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
  const webp = canvas.toDataURL("image/webp", .88);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", .9);
}

export const FEATURE_FORMATS = [
  { id: "9:16", title: "9:16 · сторис", width: 1080, height: 1920 },
  { id: "4:5", title: "4:5 · пост", width: 1080, height: 1350 },
  { id: "3:4", title: "3:4 · вертикальный", width: 1080, height: 1440 },
  { id: "1:1", title: "1:1 · квадрат", width: 1080, height: 1080 },
  { id: "4:3", title: "4:3 · горизонтальный", width: 1440, height: 1080 },
  { id: "16:9", title: "16:9 · широкий", width: 1920, height: 1080 }
];

export const featureFormat = id => FEATURE_FORMATS.find(format => format.id === id) || FEATURE_FORMATS[0];

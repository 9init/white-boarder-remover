const Jimp = require('jimp');
const fsAsync = require('fs').promises;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load the configuration data
const configPath = 'config.yaml';
const configContent = fs.readFileSync(configPath, 'utf8');
const config = yaml.load(configContent);

// Process images using the configuration data
const inputFolderPath = config.inputFolderPath;

if (!inputFolderPath) {
  throw new Error('Please provide the input folder path in config.yaml.');
} else {
  // Main
  const files = fs.readdirSync(inputFolderPath);
  const imagePaths = files.filter((file) => {   // Filter out non-image files
    return ['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase());
  }).map((file) => path.join(inputFolderPath, file));

  console.log(`Processing ${imagePaths.length} images from: ${inputFolderPath}`);
  processImages(imagePaths).then(() => console.log('All images processed successfully.'));
}

function calculateEdgeCounts(bwArray2D, direction, position) {
  // count white pixels in column 0 and length-1 till find a black pixel
  let count = 0;

  if (direction === 'vertical') {
    for (let y = position === 'top' ? 0 : bwArray2D.length - 1; position === 'top' ? y < bwArray2D.length : y >= 0; position === 'top' ? y++ : y--) {
      if (bwArray2D[y][position === 'left' ? 0 : bwArray2D[y].length - 1] === 1) {
        count++;
        continue;
      }
      break;
    }
  } else if (direction === 'horizontal') {
    for (let x = position === 'left' ? 0 : bwArray2D[0].length - 1; position === 'left' ? x < bwArray2D[0].length : x >= 0; position === 'left' ? x++ : x--) {
      if (bwArray2D[position === 'top' ? 0 : bwArray2D.length - 1][x] === 1) {
        count++;
        continue;
      }
      break;
    }
  } else {
    throw new Error('Invalid direction. Use "vertical" or "horizontal".');
  }

  return count;
};

async function cropImage(inputImagePath) {
  const image = await Jimp.read(inputImagePath);
  const width = image.getWidth();
  const height = image.getHeight();
  const bwArray2D = Array.from({ length: height }, () => Array(width).fill(0));
  const rgbArray2D = Array.from({ length: height }, () => Array(width).fill([0, 0, 0]));
  image.scan(0, 0, width, height, (x, y, idx) => {
    const average = (image.bitmap.data[idx] + image.bitmap.data[idx + 1] + image.bitmap.data[idx + 2]) / 3;
    const bit = average > 128 ? 1 : 0; // 1 for white, 0 for black

    bwArray2D[y][x] = bit;
    rgbArray2D[y][x] = [image.bitmap.data[idx], image.bitmap.data[idx + 1], image.bitmap.data[idx + 2]];
  });

  // Vertical edge counts
  const vTopLeft = calculateEdgeCounts(bwArray2D, 'vertical', 'top');
  const vBottomLeft = calculateEdgeCounts(bwArray2D, 'vertical', 'bottom');
  const vTopRight = calculateEdgeCounts(bwArray2D, 'vertical', 'top');
  const vBottomRight = calculateEdgeCounts(bwArray2D, 'vertical', 'bottom');
  const vTopMiddle = calculateEdgeCounts(bwArray2D, 'vertical', 'top');
  const vBottomMiddle = calculateEdgeCounts(bwArray2D, 'vertical', 'bottom');

  // Horizontal edge counts
  const hTopLeft = calculateEdgeCounts(bwArray2D, 'horizontal', 'top');
  const hTopRight = calculateEdgeCounts(bwArray2D, 'horizontal', 'top');
  const hBottomLeft = calculateEdgeCounts(bwArray2D, 'horizontal', 'bottom');
  const hBottomRight = calculateEdgeCounts(bwArray2D, 'horizontal', 'bottom');
  const hTopMiddle = calculateEdgeCounts(bwArray2D, 'horizontal', 'top');
  const hBottomMiddle = calculateEdgeCounts(bwArray2D, 'horizontal', 'bottom');

  // vertical
  const smallerVTop = vTopLeft < vTopRight ? vTopLeft : vTopRight;
  const smallerVBottom = vBottomLeft < vBottomRight ? vBottomLeft : vBottomRight;
  const smallerVMiddle = vTopMiddle < vBottomMiddle ? vTopMiddle : vBottomMiddle;
  let smallerVertical = smallerVTop < smallerVBottom ? smallerVTop : smallerVBottom;
  smallerVertical = smallerVMiddle < smallerVertical ? smallerVMiddle : smallerVertical;
  smallerVertical = smallerVertical < height / 3 ? smallerVertical : 0;

  // horizontal
  const smallerHLeft = hTopLeft < hBottomLeft ? hTopLeft : hBottomLeft;
  const smallerHRight = hTopRight < hBottomRight ? hTopRight : hBottomRight;
  const smallerHMiddle = hTopMiddle < hBottomMiddle ? hTopMiddle : hBottomMiddle;
  let smallerHorizontal = smallerHLeft < smallerHRight ? smallerHLeft : smallerHRight;
  smallerHorizontal = smallerHMiddle < smallerHorizontal ? smallerHMiddle : smallerHorizontal;
  smallerHorizontal = smallerHorizontal < width / 3 ? smallerHorizontal : 0;

  // crop the image from top and bottom if smallerVertical is greater than smallerHorizontal otherwise crop from left and right
  const cropFromTop = smallerVertical > smallerHorizontal;

  if (cropFromTop) {
    return rgbArray2D.slice(smallerVertical, height - smallerVertical);
  } else {
    return rgbArray2D.map(row => row.slice(1 + smallerHorizontal, width - smallerHorizontal - 1));
  }
};

async function imageFromBWArray2D(img) {
  const image = new Jimp(img.array2D[0].length, img.array2D.length);
  img.array2D.forEach((row, y) => {
    row.forEach((bit, x) => {
      const color = bit == 1 ? 0xFFFFFFFF : 0xFF000000;
      image.setPixelColor(color, x, y);
    });
  });

  const outputFolderPath = config.outputFolderPath || path.join(inputFolderPath, 'output');
  await fsAsync.mkdir(outputFolderPath, { recursive: true });

  const outputImagePath = path.join(outputFolderPath, `${img.name}.${img.extension}`);
  await image.writeAsync(outputImagePath);
}

async function saveImgFromRGBArray(img) {
  const image = new Jimp(img.array2D[0].length, img.array2D.length);
  img.array2D.forEach((row, y) => {
    row.forEach((rgb, x) => {
      const [r, g, b] = rgb;
      image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
    });
  });

  const outputFolderPath = config.outputFolderPath || path.join(inputFolderPath, 'output');
  await fsAsync.mkdir(outputFolderPath, { recursive: true });

  const outputImagePath = path.join(outputFolderPath, `${img.name}.${img.extension}`);
  await image.writeAsync(outputImagePath);
}

async function processImages(imagePaths) {
  for (const inputImagePath of imagePaths) {
    const array2D = await cropImage(inputImagePath);

    const img = {
      name: path.basename(inputImagePath, path.extname(inputImagePath)),
      extension: path.extname(inputImagePath).replace('.', ''),
      array2D,
    };

    await saveImgFromRGBArray(img);
    console.log(`Image cropped successfully: ${inputImagePath}`);
  }
}


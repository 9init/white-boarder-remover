# Image White Boarder Remover Tool

The Image White Boarder Remover Tool is a command-line utility that helps to clip white spaces around images.

## Installation

1. Ensure you have Node.js installed. You can download it [here](https://nodejs.org/).

2. Clone this repository to your local machine:

   ```bash
   git clone https://github.com/9init/white-boarder-remover.git
   ```

3. Change to the tool's directory:

   ```bash
   cd white-boarder-remover
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

1. Create if not exist a config.yaml file in the root directory. Example configuration:
   ```yaml
   inputFolderPath: /path/to/images
   batchSize: 10
   ```
   Adjust the inputFolderPath and batchSize based on your requirements.

## Usage

1. Run the tool:

   ```bash
    npm start
   ```

2. The tool will process images in batches, automatically calculating edge counts in various directions and cropping white borders. The results will be logged, and the cropped images will be saved in the "output" folder.

## Example Output

```bash
Processing images from: /path/to/images
Image cropped successfully: /path/to/images/image_1.jpg
Image cropped successfully: /path/to/images/image_2.jpg
Image cropped successfully: /path/to/images/image_xx.jpg
All images processed successfully.
```

## License

This project is licensed under the MIT License, Feel free to adjust the paths and wording according to your specific project structure and requirements.

import 'dotenv/config';
import Together from 'together-ai';

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

async function generateImage() {
  try {
    const response = await together.images.create({
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: "a beautiful sunset over mountains",
      width: 1024,
      height: 768,
      steps: 4,
      n: 1,
      response_format: "b64_json"
    });
    
    console.log(response.data[0].b64_json);
  } catch (error) {
    console.error('Error generating image:', error);
  }
}

generateImage();
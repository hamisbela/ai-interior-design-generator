import 'dotenv/config';
import express from 'express';
import Together from 'together-ai';

const app = express();
const port = 3000;

app.use(express.static('public'));

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

app.get('/generate', async (req, res) => {
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
    
    res.json({ image: response.data[0].b64_json });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
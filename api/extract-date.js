export default async function handler(req, res) {
  console.log('=== API Request Received ===');
  console.log('Method:', req.method);
  console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const { imageData } = req.body;
 
  if (!imageData) {
    return res.status(400).json({ error: 'No image data provided' });
  }
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
 
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in environment variables');
    return res.status(500).json({ 
      error: 'API key not configured',
      details: 'ANTHROPIC_API_KEY environment variable is missing'
    });
  }
 
  try {
    let base64Image = imageData;
    if (imageData.includes('base64,')) {
      base64Image = imageData.split('base64,')[1];
    }
 
    console.log('Calling Claude API...');
    console.log('Image size:', base64Image.length, 'bytes');
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Look at this image. Find and extract ONLY the expiration date, best-by date, use-by date, or sell-by date. 
 
Return ONLY the date in this exact format: "Month Day, Year" (example: "Dec 15, 2024")
 
If you cannot find any date, respond with: "DATE_NOT_FOUND"`,
              },
            ],
          },
        ],
      }),
    });
 
    console.log('Claude API Response Status:', response.status);
 
    const data = await response.json();
 
    if (!response.ok) {
      console.error('Claude API Error:', data);
      return res.status(500).json({
        error: 'Failed to process image',
        details: data.error?.message || 'Unknown error from Claude API',
        claudeError: data.error,
      });
    }
 
    console.log('Claude Response:', data.content[0]?.text);
 
    const detectedDate = data.content[0]?.text?.trim() || 'DATE_NOT_FOUND';
 
    return res.status(200).json({
      success: true,
      date: detectedDate,
      found: detectedDate !== 'DATE_NOT_FOUND',
    });
  } catch (error) {
    console.error('Backend Error:', error.message);
    console.error('Full Error:', error);
    return res.status(500).json({
      error: 'Failed to process image',
      details: error.message,
      type: error.constructor.name,
    });
  }
}

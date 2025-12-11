// AI Image Generation Service
// Uses OpenAI DALL-E API to generate images for drinks

class ImageGenerator {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.openai.com/v1/images/generations';
    }

    // Initialize with API key from config
    initialize(apiKey) {
        this.apiKey = apiKey;
    }

    // Check if API key is configured
    isConfigured() {
        return !!this.apiKey && this.apiKey.trim() !== '';
    }

    // Generate a prompt for a drink based on its name and description
    generatePrompt(product) {
        const name = product.name || '';
        const description = product.description || '';
        const temp = product.temp || '';
        
        // Build a descriptive prompt
        let prompt = `A professional, appetizing photograph of a ${name}`;
        
        // Add temperature context
        if (temp === 'hot') {
            prompt += ', served hot in a warm ceramic mug';
        } else if (temp === 'cold') {
            prompt += ', served cold in a clear glass with ice';
        } else if (temp === 'both') {
            prompt += ', beautifully presented';
        }
        
        // Add description context if available
        if (description) {
            // Extract key descriptive words from description
            const descWords = description.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3)
                .slice(0, 5)
                .join(', ');
            if (descWords) {
                prompt += `, featuring ${descWords}`;
            }
        }
        
        prompt += ', on a rustic wooden table, natural lighting, coffee shop aesthetic, high quality food photography';
        
        return prompt;
    }

    // Generate an image for a product using DALL-E
    async generateImage(product, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured. Please add your API key in the config.');
        }

        const prompt = options.prompt || this.generatePrompt(product);
        const size = options.size || '1024x1024'; // Options: 256x256, 512x512, 1024x1024
        const model = options.model || 'dall-e-3'; // Use DALL-E 3 for better quality
        const quality = options.quality || 'standard'; // Options: standard, hd
        const style = options.style || 'natural'; // Options: vivid, natural

        try {
            // For DALL-E 3, we need to use a different endpoint and parameters
            const requestBody = {
                model: model,
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality,
                style: style
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                return {
                    url: data.data[0].url,
                    revisedPrompt: data.data[0].revised_prompt || prompt,
                    success: true
                };
            } else {
                throw new Error('No image URL returned from API');
            }
        } catch (error) {
            console.error('Image generation error:', error);
            throw error;
        }
    }

    // Generate images for multiple products (with rate limiting)
    async generateImagesForProducts(products, options = {}) {
        const results = [];
        const delay = options.delay || 2000; // 2 second delay between requests to avoid rate limits
        const onProgress = options.onProgress || (() => {});

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            try {
                onProgress({
                    current: i + 1,
                    total: products.length,
                    product: product.name,
                    status: 'generating'
                });

                const result = await this.generateImage(product, options);
                results.push({
                    productId: product.id,
                    productName: product.name,
                    success: true,
                    imageUrl: result.url,
                    revisedPrompt: result.revisedPrompt
                });

                // Wait before next request (except for last one)
                if (i < products.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                results.push({
                    productId: product.id,
                    productName: product.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }
}

// Global instance
const imageGenerator = new ImageGenerator();


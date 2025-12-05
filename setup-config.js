// Secure Configuration Setup Script
// Run this once to securely configure your API keys
// Usage: node setup-config.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

function questionSecret(prompt) {
    return new Promise((resolve) => {
        // Hide input for security (basic implementation)
        process.stdout.write(prompt);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        let input = '';
        process.stdin.on('data', function(char) {
            char = char.toString();
            switch(char) {
                case '\n':
                case '\r':
                case '\u0004':
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write('\n');
                    resolve(input);
                    break;
                case '\u0003':
                    process.exit();
                    break;
                case '\u007f':
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    break;
                default:
                    input += char;
                    process.stdout.write('*');
                    break;
            }
        });
    });
}

async function setupConfig() {
    console.log('\n=== Coffee Club API Configuration Setup ===\n');
    console.log('This will securely store your API keys in config.local.js');
    console.log('(This file is gitignored and will not be committed)\n');

    const supabaseUrl = await question('Enter your Supabase Project URL: ');
    const supabaseKey = await questionSecret('Enter your Supabase Anon Key: ');
    const stripeKey = await questionSecret('Enter your Stripe Publishable Key: ');

    if (!supabaseUrl.trim() || !supabaseKey.trim() || !stripeKey.trim()) {
        console.log('\n✗ Error: All fields are required');
        rl.close();
        process.exit(1);
    }

    // Create a config file that's gitignored
    const config = {
        supabase: {
            url: supabaseUrl.trim(),
            anonKey: supabaseKey.trim()
        },
        stripe: {
            publishableKey: stripeKey.trim()
        }
    };

    // Write to a gitignored config file
    const configPath = path.join(__dirname, 'config.local.js');
    const configContent = `// Local configuration - DO NOT COMMIT TO VERSION CONTROL
// This file is gitignored and contains sensitive API keys
// Generated automatically by setup-config.js

window.COFFEE_CLUB_CONFIG = ${JSON.stringify(config, null, 2)};
`;

    fs.writeFileSync(configPath, configContent);
    console.log('\n✓ Configuration saved to config.local.js');
    console.log('✓ This file is gitignored and will not be committed');
    console.log('✓ Your API keys are now securely configured\n');

    rl.close();
}

setupConfig().catch((error) => {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
});


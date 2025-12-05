// Database Setup Script
// This script connects to Supabase and creates all required tables
// Usage: node setup-database.js [--service-role-key YOUR_SERVICE_ROLE_KEY]

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load configuration from config.local.js
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.local.js');
        if (!fs.existsSync(configPath)) {
            console.error('❌ Error: config.local.js not found!');
            console.error('Please run setup-config.js or create config.local.js first.');
            process.exit(1);
        }

        const configContent = fs.readFileSync(configPath, 'utf8');
        const configMatch = configContent.match(/window\.COFFEE_CLUB_CONFIG\s*=\s*({[\s\S]*?});/);
        if (!configMatch) {
            console.error('❌ Error: Could not parse config.local.js');
            process.exit(1);
        }

        const config = eval('(' + configMatch[1] + ')');
        
        if (!config.supabase?.url || !config.supabase?.anonKey) {
            console.error('❌ Error: Supabase URL and Anon Key are required in config.local.js');
            process.exit(1);
        }

        return config;
    } catch (error) {
        console.error('❌ Error loading configuration:', error.message);
        process.exit(1);
    }
}

// Execute SQL via Supabase REST API (requires service role key)
async function executeSQL(sql, supabaseUrl, serviceRoleKey) {
    return new Promise((resolve, reject) => {
        const url = new URL(supabaseUrl);
        const hostname = url.hostname;
        const path = '/rest/v1/rpc/exec_sql';
        
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let completed = 0;
        const results = [];

        statements.forEach((statement, index) => {
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.length === 0) {
                completed++;
                if (completed === statements.length) {
                    resolve(results);
                }
                return;
            }

            const postData = JSON.stringify({
                query: statement + ';'
            });

            const options = {
                hostname: hostname,
                port: 443,
                path: '/rest/v1/rpc/exec_sql',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    completed++;
                    if (completed === statements.length) {
                        resolve(results);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    });
}

async function setupDatabase() {
    console.log('\n=== Coffee Club Database Setup ===\n');

    const config = loadConfig();
    console.log('✓ Configuration loaded');
    console.log(`✓ Supabase URL: ${config.supabase.url}\n`);

    // Check for service role key in arguments
    const serviceRoleKey = process.argv.find(arg => arg.startsWith('--service-role-key='))?.split('=')[1] 
        || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Load the SQL schema
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Error: database-schema.sql not found!');
        process.exit(1);
    }

    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✓ SQL schema loaded\n');

    if (!serviceRoleKey) {
        console.log('⚠️  Note: Service role key not provided.');
        console.log('   The anon key cannot execute DDL statements.\n');
        console.log('📋 To set up the database, choose one of these options:\n');
        console.log('   Option 1: Run SQL in Supabase Dashboard (Recommended)');
        console.log('   1. Open your Supabase Dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Click "New Query"');
        console.log('   4. Copy and paste the contents of database-schema.sql');
        console.log('   5. Click "Run" to execute\n');
        console.log('   Option 2: Use service role key (Advanced)');
        console.log('   Run: node setup-database.js --service-role-key=YOUR_SERVICE_ROLE_KEY');
        console.log('   (Find service role key in Supabase Dashboard → Settings → API)\n');
        console.log('📄 SQL Schema Location:', schemaPath);
        console.log('\nSQL Schema Preview:\n');
        console.log('─'.repeat(60));
        console.log(sqlSchema.substring(0, 500) + '...\n[Full schema in database-schema.sql]');
        console.log('─'.repeat(60));
        return;
    }

    // Try to execute SQL with service role key
    console.log('🔧 Attempting to execute SQL with service role key...\n');
    
    try {
        // Note: Supabase doesn't have a direct SQL execution endpoint via REST API
        // We need to use the PostgREST API or Management API
        // For now, we'll provide instructions
        
        console.log('⚠️  Direct SQL execution via API is not available.');
        console.log('   Please use the Supabase Dashboard SQL Editor instead.\n');
        console.log('📋 Quick Steps:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql');
        console.log('   2. Paste the SQL from database-schema.sql');
        console.log('   3. Click "Run"\n');
        
        console.log('📄 Full SQL Schema:\n');
        console.log('─'.repeat(60));
        console.log(sqlSchema);
        console.log('─'.repeat(60));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📋 Please run the SQL manually in Supabase Dashboard SQL Editor.');
    }
}

setupDatabase().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});


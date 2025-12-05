// Database Setup Script v2
// Uses Supabase JS client to execute SQL
// Usage: node setup-database-v2.js [--service-role-key YOUR_KEY]

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
        
        if (!config.supabase?.url) {
            console.error('❌ Error: Supabase URL is required in config.local.js');
            process.exit(1);
        }

        return config;
    } catch (error) {
        console.error('❌ Error loading configuration:', error.message);
        process.exit(1);
    }
}

async function setupDatabase() {
    console.log('\n=== Coffee Club Database Setup ===\n');

    const config = loadConfig();
    console.log('✓ Configuration loaded');
    console.log(`✓ Supabase URL: ${config.supabase.url}\n`);

    // Check for service role key
    const serviceRoleKey = process.argv.find(arg => arg.startsWith('--service-role-key='))?.split('=')[1] 
        || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Load SQL schema
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Error: database-schema.sql not found!');
        process.exit(1);
    }

    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✓ SQL schema loaded\n');

    if (!serviceRoleKey) {
        console.log('⚠️  Service role key not provided.');
        console.log('   DDL statements require admin privileges.\n');
        console.log('📋 Please run the SQL in Supabase Dashboard:\n');
        console.log('   1. Go to: https://supabase.com/dashboard');
        console.log('   2. Select your project');
        console.log('   3. Go to SQL Editor');
        console.log('   4. Click "New Query"');
        console.log('   5. Copy and paste the SQL from database-schema.sql');
        console.log('   6. Click "Run"\n');
        console.log('   Or provide service role key:');
        console.log('   node setup-database-v2.js --service-role-key=YOUR_KEY\n');
        console.log('📄 SQL Schema:\n');
        console.log('─'.repeat(70));
        console.log(sqlSchema);
        console.log('─'.repeat(70));
        return;
    }

    // Create Supabase client with service role key
    console.log('🔧 Connecting to Supabase with service role key...\n');
    const supabase = createClient(config.supabase.url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Test connection
    try {
        const { data, error } = await supabase.from('_realtime').select('*').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is fine
            throw error;
        }
        console.log('✓ Connected to Supabase\n');
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        console.log('\n📋 Please run the SQL manually in Supabase Dashboard SQL Editor.');
        return;
    }

    // Split SQL into executable statements
    const statements = sqlSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => {
            // Filter out comments and empty statements
            const trimmed = s.trim();
            return trimmed.length > 0 
                && !trimmed.startsWith('--') 
                && !trimmed.startsWith('/*')
                && trimmed !== '';
        });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute statements using RPC (if available) or provide instructions
    console.log('⚠️  Note: Supabase JS client cannot directly execute DDL statements.');
    console.log('   DDL statements must be run in the SQL Editor.\n');
    console.log('📋 Please execute the SQL in Supabase Dashboard:\n');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor → New Query');
    console.log('   4. Copy and paste the SQL below\n');
    console.log('─'.repeat(70));
    console.log(sqlSchema);
    console.log('─'.repeat(70));
    console.log('\n✅ After running the SQL, your database will be ready!\n');
}

setupDatabase().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});


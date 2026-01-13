#!/usr/bin/env node

/**
 * Maintenance Mode Toggle Script
 * 
 * This script allows you to quickly toggle maintenance mode from the command line.
 * Useful for testing and emergency maintenance operations.
 * 
 * Usage:
 *   node scripts/toggle-maintenance.js on      # Enable maintenance mode
 *   node scripts/toggle-maintenance.js off     # Disable maintenance mode
 *   node scripts/toggle-maintenance.js status  # Check current status
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false
  } : undefined,
});

async function getMaintenanceStatus() {
  try {
    const result = await pool.query(
      'SELECT id, maintenance_mode, deletion_lock, updated_at FROM system_settings LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No system settings found in database');
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error fetching status:', error.message);
    return null;
  }
}

async function setMaintenanceMode(enabled) {
  try {
    const result = await pool.query(
      `UPDATE system_settings 
       SET maintenance_mode = $1, updated_at = NOW() 
       WHERE id = (SELECT id FROM system_settings LIMIT 1)
       RETURNING *`,
      [enabled]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Failed to update maintenance mode');
      return false;
    }
    
    console.log(`✅ Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'} successfully`);
    console.log(`   Updated at: ${result.rows[0].updated_at}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating maintenance mode:', error.message);
    return false;
  }
}

async function main() {
  const command = process.argv[2]?.toLowerCase();
  
  console.log('\n🔧 Maintenance Mode Manager\n');
  
  if (!command || !['on', 'off', 'status'].includes(command)) {
    console.log('Usage:');
    console.log('  node scripts/toggle-maintenance.js on      # Enable maintenance mode');
    console.log('  node scripts/toggle-maintenance.js off     # Disable maintenance mode');
    console.log('  node scripts/toggle-maintenance.js status  # Check current status');
    console.log('');
    process.exit(1);
  }
  
  if (command === 'status') {
    const status = await getMaintenanceStatus();
    if (status) {
      console.log('Current System Settings:');
      console.log('========================');
      console.log(`Maintenance Mode: ${status.maintenance_mode ? '🔴 ENABLED' : '🟢 DISABLED'}`);
      console.log(`Deletion Lock:    ${status.deletion_lock ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
      console.log(`Last Updated:     ${status.updated_at}`);
      console.log('');
      
      if (status.maintenance_mode) {
        console.log('⚠️  System is in maintenance mode!');
        console.log('   Only ADMIN users can access the system.');
      } else {
        console.log('✅ System is operating normally.');
      }
    }
  } else if (command === 'on') {
    console.log('⚠️  Enabling maintenance mode...');
    console.log('   This will block all non-ADMIN users from accessing the system.\n');
    
    const success = await setMaintenanceMode(true);
    
    if (success) {
      console.log('\n📝 What this means:');
      console.log('   ✓ Only ADMIN users can access the system');
      console.log('   ✓ All other users will see the maintenance page');
      console.log('   ✓ API requests from non-admins will return 503 errors');
      console.log('\n💡 To disable: node scripts/toggle-maintenance.js off');
    }
  } else if (command === 'off') {
    console.log('✅ Disabling maintenance mode...');
    console.log('   This will restore normal access for all users.\n');
    
    const success = await setMaintenanceMode(false);
    
    if (success) {
      console.log('\n📝 What this means:');
      console.log('   ✓ Normal access restored for all users');
      console.log('   ✓ System is fully operational');
      console.log('   ✓ No restrictions in place');
    }
  }
  
  await pool.end();
  console.log('');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  pool.end();
  process.exit(1);
});

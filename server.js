/**
 * Poststratification Table Builder - Demo API
 *
 * Standalone Express server showcasing Census ACS data processing
 * for MRP (Multilevel Regression with Poststratification) modeling
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { fetchACS1Year, getAvailableYears } = require('./lib/censusClient');
const {
  buildPoststratTable,
  getPoststratTable,
  getCellsByDistrict,
  getTableStats,
  deleteTable
} = require('./lib/tableBuilder');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Poststratification Table Builder',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/info
 * API information
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Census Poststratification API',
    description: 'Build demographic lookup tables from Census ACS data for MRP modeling',
    version: '1.0.0',
    endpoints: {
      build: 'POST /api/build/:year (requires X-Admin-Secret)',
      stats: 'GET /api/stats/:year',
      district: 'GET /api/district/:year/:cd',
      availableYears: 'GET /api/available-years'
    },
    demographics: {
      ageGroups: 6,
      sexes: 2,
      raceEthnicity: 5,
      education: 5,
      censusRegions: 5,
      totalCellsPerDistrict: 300
    }
  });
});

/**
 * POST /api/build/:year
 * Build poststrat table from Census ACS 1-year data
 *
 * Requires X-Admin-Secret header for security
 */
app.post('/api/build/:year', async (req, res) => {
  try {
    // Validate admin secret
    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin secret required. Set X-Admin-Secret header.'
      });
    }

    const year = parseInt(req.params.year, 10);

    if (isNaN(year) || year < 2010 || year > new Date().getFullYear()) {
      return res.status(400).json({
        error: 'Invalid year',
        message: 'Year must be between 2010 and current year'
      });
    }

    console.log(`[${new Date().toISOString()}] Starting poststrat table build for ${year}...`);

    // Fetch Census data
    const censusData = await fetchACS1Year(year);

    if (!censusData || censusData.length === 0) {
      return res.status(404).json({
        error: `No ACS 1-year data available for ${year}`,
        message: 'ACS 1-year estimates may not be published yet. Try an earlier year (2022 or 2023).'
      });
    }

    // Build table
    const result = await buildPoststratTable(year, censusData);

    console.log(`[${new Date().toISOString()}] Build complete!`);

    res.json({
      success: true,
      message: `Poststrat table built for ${year}`,
      ...result
    });

  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({
      error: 'Failed to build poststrat table',
      message: error.message
    });
  }
});

/**
 * GET /api/stats/:year
 * Get summary statistics for a poststrat table
 */
app.get('/api/stats/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const stats = await getTableStats(year);

    if (stats.totalCells === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No poststrat table exists for ${year}. Use POST /api/build/${year} to create one.`
      });
    }

    res.json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/district/:year/:cd
 * Get cells for a specific congressional district
 *
 * Example: GET /api/district/2022/TX-32
 */
app.get('/api/district/:year/:cd', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const cd = req.params.cd.toUpperCase();

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    if (!/^[A-Z]{2}-\d{2}$/.test(cd)) {
      return res.status(400).json({
        error: 'Invalid congressional district format',
        message: 'Format should be STATE-NN (e.g., TX-32, CA-01)'
      });
    }

    const cells = await getCellsByDistrict(year, cd);

    if (cells.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No poststrat cells for ${cd} in ${year}. Build the table first.`
      });
    }

    // Calculate district total population
    const totalPopulation = cells.reduce((sum, cell) => sum + cell.population, 0);

    // Get demographic breakdowns
    const demographics = {
      ageGroups: [...new Set(cells.map(c => c.ageGroup))].sort(),
      sexes: [...new Set(cells.map(c => c.sex))],
      raceEth: [...new Set(cells.map(c => c.raceEth))],
      education: [...new Set(cells.map(c => c.education))]
    };

    res.json({
      success: true,
      year,
      cd,
      cellCount: cells.length,
      totalPopulation,
      demographics,
      cells: req.query.full === 'true' ? cells : cells.slice(0, 10) // Return first 10 by default
    });

  } catch (error) {
    console.error('Error fetching district cells:', error);
    res.status(500).json({
      error: 'Failed to fetch district cells',
      message: error.message
    });
  }
});

/**
 * GET /api/available-years
 * Get list of available ACS years
 */
app.get('/api/available-years', (req, res) => {
  try {
    const years = getAvailableYears();
    res.json({
      success: true,
      years,
      message: 'ACS 1-year data is typically available 12-18 months after collection year',
      recommended: years[1] // Usually current year - 2
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get available years',
      message: error.message
    });
  }
});

/**
 * DELETE /api/table/:year
 * Delete poststrat table for a year (admin only)
 */
app.delete('/api/table/:year', async (req, res) => {
  try {
    // Validate admin secret
    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized - Admin secret required' });
    }

    const year = parseInt(req.params.year, 10);

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const deletedCount = await deleteTable(year);

    res.json({
      success: true,
      year,
      deletedCount,
      message: `Deleted ${deletedCount} cells for ${year}`
    });

  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({
      error: 'Failed to delete table',
      message: error.message
    });
  }
});

// ============================================================================
// FRONTEND
// ============================================================================

/**
 * GET /
 * Serve demo frontend
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('============================================================');
  console.log('Census Poststratification API - Demo Server');
  console.log('============================================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('API Endpoints:');
  console.log(`  GET  /api/info              - API information`);
  console.log(`  GET  /api/health            - Health check`);
  console.log(`  GET  /api/available-years   - List available ACS years`);
  console.log(`  POST /api/build/:year       - Build table (requires admin secret)`);
  console.log(`  GET  /api/stats/:year       - Get table statistics`);
  console.log(`  GET  /api/district/:year/:cd - Get district cells`);
  console.log('');
  console.log('Demo UI:');
  console.log(`  http://localhost:${PORT}/`);
  console.log('============================================================');
});

module.exports = app;

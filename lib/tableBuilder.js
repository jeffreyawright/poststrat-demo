/**
 * Poststratification Table Builder
 *
 * Cross-tabulates Census ACS data into demographic cells for MRP modeling.
 * Each cell represents a unique combination of:
 * - Age group (6 categories)
 * - Sex (2 categories)
 * - Race/ethnicity (5 categories)
 * - Education (5 categories)
 * - Census region (5 categories derived from state)
 * - Congressional district
 */

const { PrismaClient } = require('@prisma/client');
const {
  recodeAge,
  recodeRace,
  recodeEducation,
  getRegion,
  parseDistrict,
  RECODE_SPECS
} = require('./recodeHelpers');

const prisma = new PrismaClient();

/**
 * Build poststratification table from Census ACS data
 *
 * @param {number} year - ACS year (e.g., 2023, 2022)
 * @param {Array} censusData - Array of district-level Census data
 * @returns {Promise<Object>} Build statistics
 */
async function buildPoststratTable(year, censusData) {
  console.log(`Building poststrat table for ${year}...`);

  const cells = [];
  let skippedDistricts = 0;

  for (const row of censusData) {
    try {
      // Parse district info
      const { state, cd } = parseDistrict(row);

      // Get census region from state
      const censusRegion = getRegion(state);

      // Recode demographics
      const raceCounts = recodeRace(row);
      const educationCounts = recodeEducation(row);

      // Process each sex
      for (const sex of ['Female', 'Male']) {
        const ageCounts = recodeAge(row, sex);

        // Cross-tabulate: age × race × education
        for (const [ageGroup, ageCount] of Object.entries(ageCounts)) {
          for (const [raceEth, raceCount] of Object.entries(raceCounts)) {
            for (const [education, eduCount] of Object.entries(educationCounts)) {

              // Calculate population for this cell
              // Proportional allocation: (age%) × (race%) × (edu%)
              const totalAge = Object.values(ageCounts).reduce((a, b) => a + b, 0);
              const totalRace = Object.values(raceCounts).reduce((a, b) => a + b, 0);
              const totalEdu = Object.values(educationCounts).reduce((a, b) => a + b, 0);

              if (totalAge === 0 || totalRace === 0 || totalEdu === 0) {
                continue; // Skip if no population data
              }

              // Proportional allocation
              const ageProp = ageCount / totalAge;
              const raceProp = raceCount / totalRace;
              const eduProp = eduCount / totalEdu;

              // Estimated cell population
              const population = Math.round(totalAge * ageProp * raceProp * eduProp);

              // Only store cells with population > 0
              if (population > 0) {
                cells.push({
                  year,
                  state,
                  cd,
                  ageGroup,
                  sex,
                  raceEth,
                  education,
                  censusRegion,
                  population
                });
              }
            }
          }
        }
      }

      if (cells.length % 10000 === 0) {
        console.log(`Processed ${cells.length} cells so far...`);
      }

    } catch (error) {
      console.error(`Error processing district ${row.NAME}:`, error.message);
      skippedDistricts++;
    }
  }

  console.log(`Generated ${cells.length} cells from ${censusData.length - skippedDistricts} districts`);

  // Store cells in database (batch upsert for efficiency)
  console.log('Storing cells in database...');

  const batchSize = 5000;
  let storedCount = 0;

  for (let i = 0; i < cells.length; i += batchSize) {
    const batch = cells.slice(i, i + batchSize);

    // Use createMany with skipDuplicates to avoid conflicts
    await prisma.poststratCell.createMany({
      data: batch,
      skipDuplicates: true
    });

    storedCount += batch.length;
    console.log(`Stored ${storedCount}/${cells.length} cells...`);
  }

  return {
    success: true,
    year,
    districtsProcessed: censusData.length - skippedDistricts,
    districtsSkipped: skippedDistricts,
    cellsGenerated: cells.length,
    cellsStored: storedCount,
    dimensions: {
      ageGroups: RECODE_SPECS.ageGroup.levels.length,
      sexes: RECODE_SPECS.sex.levels.length,
      raceEth: RECODE_SPECS.raceEth.levels.length,
      education: RECODE_SPECS.education.levels.length,
      censusRegions: RECODE_SPECS.censusRegion.levels.length
    }
  };
}

/**
 * Get poststrat table for a specific year
 *
 * @param {number} year - ACS year
 * @returns {Promise<Array>} Array of cells
 */
async function getPoststratTable(year) {
  return await prisma.poststratCell.findMany({
    where: { year },
    orderBy: [
      { state: 'asc' },
      { cd: 'asc' },
      { ageGroup: 'asc' },
      { sex: 'asc' },
      { raceEth: 'asc' },
      { education: 'asc' }
    ]
  });
}

/**
 * Get cells for a specific congressional district
 *
 * @param {number} year - ACS year
 * @param {string} cd - Congressional district (e.g., "TX-32")
 * @returns {Promise<Array>} Array of cells for the district
 */
async function getCellsByDistrict(year, cd) {
  return await prisma.poststratCell.findMany({
    where: { year, cd },
    orderBy: [
      { ageGroup: 'asc' },
      { sex: 'asc' },
      { raceEth: 'asc' },
      { education: 'asc' }
    ]
  });
}

/**
 * Get summary statistics for a poststrat table
 *
 * @param {number} year - ACS year
 * @returns {Promise<Object>} Statistics
 */
async function getTableStats(year) {
  const totalCells = await prisma.poststratCell.count({ where: { year } });

  const districts = await prisma.poststratCell.findMany({
    where: { year },
    select: { cd: true },
    distinct: ['cd']
  });

  const totalPopulation = await prisma.poststratCell.aggregate({
    where: { year },
    _sum: { population: true }
  });

  return {
    year,
    totalCells,
    districtsCount: districts.length,
    totalPopulation: totalPopulation._sum.population || 0,
    averageCellsPerDistrict: Math.round(totalCells / districts.length)
  };
}

/**
 * Delete poststrat table for a specific year
 *
 * @param {number} year - ACS year
 * @returns {Promise<number>} Number of cells deleted
 */
async function deleteTable(year) {
  const result = await prisma.poststratCell.deleteMany({
    where: { year }
  });
  return result.count;
}

module.exports = {
  buildPoststratTable,
  getPoststratTable,
  getCellsByDistrict,
  getTableStats,
  deleteTable
};
